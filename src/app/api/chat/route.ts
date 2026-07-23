import { z } from 'zod';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import SearchAgent from '@/lib/agents/search';
import SessionManager from '@/lib/session';
import { ChatTurnMessage } from '@/lib/types';
import { SearchSources } from '@/lib/agents/search/types';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { chats } from '@/lib/db/schema';
import UploadManager from '@/lib/uploads/manager';
import {
  assertHasCredits,
  assertSearchAllowed,
  assertWorkspaceMembership,
  creditCostForMode,
  debitSearchCredits,
  InsufficientCreditsError,
  insertOsMessage,
  isOwebModeEnabled,
  requireWorkspaceId,
  resolveAuthFromRequest,
  upsertOsChat,
  type OptimizationMode,
} from '@/lib/oweb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  content: z.string().min(1, 'Message content is required'),
});

const chatModelSchema: z.ZodType<ModelWithProvider> = z.object({
  providerId: z.string({ message: 'Chat model provider id must be provided' }),
  key: z.string({ message: 'Chat model key must be provided' }),
});

const embeddingModelSchema: z.ZodType<ModelWithProvider> = z.object({
  providerId: z.string({
    message: 'Embedding model provider id must be provided',
  }),
  key: z.string({ message: 'Embedding model key must be provided' }),
});

const bodySchema = z.object({
  message: messageSchema,
  optimizationMode: z.enum(['speed', 'balanced', 'quality'], {
    message: 'Optimization mode must be one of: speed, balanced, quality',
  }),
  sources: z.array(z.string()).optional().default([]),
  history: z
    .array(z.tuple([z.string(), z.string()]))
    .optional()
    .default([]),
  files: z.array(z.string()).optional().default([]),
  chatModel: chatModelSchema,
  embeddingModel: embeddingModelSchema,
  systemInstructions: z.string().nullable().optional().default(''),
});

type Body = z.infer<typeof bodySchema>;

const safeValidateBody = (data: unknown) => {
  const result = bodySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

const ensureChatExists = async (input: {
  id: string;
  sources: SearchSources[];
  query: string;
  fileIds: string[];
}) => {
  try {
    const exists = await db.query.chats
      .findFirst({
        where: eq(chats.id, input.id),
      })
      .execute();

    if (!exists) {
      await db.insert(chats).values({
        id: input.id,
        createdAt: new Date().toISOString(),
        sources: input.sources,
        title: input.query,
        files: input.fileIds.map((id) => {
          return {
            fileId: id,
            name: UploadManager.getFile(id)?.name || 'Uploaded File',
          };
        }),
      });
    }
  } catch (err) {
    console.error('Failed to check/save chat:', err);
  }
};

export const POST = async (req: Request) => {
  try {
    const reqBody = (await req.json()) as Body;

    const parseBody = safeValidateBody(reqBody);

    if (!parseBody.success) {
      return Response.json(
        { message: 'Invalid request body', error: parseBody.error },
        { status: 400 },
      );
    }

    const body = parseBody.data as Body;
    const { message } = body;

    if (message.content === '') {
      return Response.json(
        {
          message: 'Please provide a message to process',
        },
        { status: 400 },
      );
    }

    const owebMode = isOwebModeEnabled();
    let orgId: string | null = null;
    let userId: string | null = null;
    let accessToken: string | null = null;
    let creditCost = 0;

    if (owebMode) {
      const auth = await resolveAuthFromRequest(req);
      if (!auth) {
        return Response.json(
          {
            message: 'Sign in with OWeb to search',
            code: 'auth_required',
            upgradeUrl: 'https://oweb.one/signup',
          },
          { status: 401 },
        );
      }

      const workspaceId = requireWorkspaceId(req);
      if (!workspaceId) {
        return Response.json(
          { message: 'X-Workspace-Id header is required', code: 'workspace_required' },
          { status: 400 },
        );
      }

      const workspace = await assertWorkspaceMembership(
        auth.user.id,
        workspaceId,
      );
      if (!workspace) {
        return Response.json(
          { message: 'Not a member of this workspace', code: 'forbidden' },
          { status: 403 },
        );
      }

      const entitlement = assertSearchAllowed({
        workspace,
        mode: body.optimizationMode as OptimizationMode,
        hasFiles: body.files.length > 0,
      });
      if (!entitlement.ok) {
        return Response.json(
          {
            message: entitlement.reason || 'Plan does not allow this search',
            code: 'entitlement',
            upgradeUrl: entitlement.upgradeUrl,
            packageSlug: entitlement.packageSlug,
          },
          { status: 402 },
        );
      }

      creditCost = creditCostForMode(body.optimizationMode as OptimizationMode, {
        hasFiles: body.files.length > 0,
      });

      if (!auth.user.isAnonymous) {
        try {
          await assertHasCredits(workspace.id, creditCost);
          await debitSearchCredits({
            orgId: workspace.id,
            amount: creditCost,
            messageId: message.messageId,
            mode: body.optimizationMode as OptimizationMode,
            actorUserId: auth.user.id,
            model: `${body.chatModel.providerId}/${body.chatModel.key}`,
          });
        } catch (err) {
          if (err instanceof InsufficientCreditsError) {
            return Response.json(
              {
                message: 'Insufficient OneCredits',
                code: 'insufficient_credits',
                upgradeUrl: entitlement.upgradeUrl,
              },
              { status: 402 },
            );
          }
          throw err;
        }
      }

      orgId = workspace.id;
      userId = auth.user.id;
      accessToken = auth.accessToken;
    }

    const registry = new ModelRegistry();

    const [llm, embedding] = await Promise.all([
      registry.loadChatModel(body.chatModel.providerId, body.chatModel.key),
      registry.loadEmbeddingModel(
        body.embeddingModel.providerId,
        body.embeddingModel.key,
      ),
    ]);

    const history: ChatTurnMessage[] = body.history.map((msg) => {
      if (msg[0] === 'human') {
        return {
          role: 'user',
          content: msg[1],
        };
      } else {
        return {
          role: 'assistant',
          content: msg[1],
        };
      }
    });

    const agent = new SearchAgent();
    const session = SessionManager.createSession();

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const disconnect = session.subscribe((event: string, data: any) => {
      if (event === 'data') {
        if (data.type === 'block') {
          writer.write(
            encoder.encode(
              JSON.stringify({
                type: 'block',
                block: data.block,
              }) + '\n',
            ),
          );
        } else if (data.type === 'updateBlock') {
          writer.write(
            encoder.encode(
              JSON.stringify({
                type: 'updateBlock',
                blockId: data.blockId,
                patch: data.patch,
              }) + '\n',
            ),
          );
        } else if (data.type === 'researchComplete') {
          writer.write(
            encoder.encode(
              JSON.stringify({
                type: 'researchComplete',
              }) + '\n',
            ),
          );
        }
      } else if (event === 'end') {
        writer.write(
          encoder.encode(
            JSON.stringify({
              type: 'messageEnd',
            }) + '\n',
          ),
        );
        writer.close();
        session.removeAllListeners();
      } else if (event === 'error') {
        writer.write(
          encoder.encode(
            JSON.stringify({
              type: 'error',
              data: data.data,
            }) + '\n',
          ),
        );
        writer.close();
        session.removeAllListeners();
      }
    });

    agent.searchAsync(session, {
      chatHistory: history,
      followUp: message.content,
      chatId: body.message.chatId,
      messageId: body.message.messageId,
      config: {
        llm,
        embedding: embedding,
        sources: body.sources as SearchSources[],
        mode: body.optimizationMode,
        fileIds: body.files,
        systemInstructions: body.systemInstructions || 'None',
      },
    });

    // Local SQLite path (self-host). Constellation mode also writes os_* below.
    ensureChatExists({
      id: body.message.chatId,
      sources: body.sources as SearchSources[],
      fileIds: body.files,
      query: body.message.content,
    });

    if (owebMode && orgId && userId) {
      const files = body.files.map((id) => ({
        fileId: id,
        name: UploadManager.getFile(id)?.name || 'Uploaded File',
      }));
      void upsertOsChat({
        accessToken,
        id: body.message.chatId,
        orgId,
        userId,
        title: message.content.slice(0, 120),
        sources: body.sources as SearchSources[],
        files,
        optimizationMode: body.optimizationMode,
      });
      void insertOsMessage({
        accessToken,
        chatId: body.message.chatId,
        orgId,
        userId,
        messageId: message.messageId,
        query: message.content,
        status: 'answering',
        model: `${body.chatModel.providerId}/${body.chatModel.key}`,
        creditsUsed: creditCost,
      });
    }

    req.signal.addEventListener('abort', () => {
      disconnect();
      writer.close();
    });

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err) {
    console.error('An error occurred while processing chat request:', err);
    return Response.json(
      { message: 'An error occurred while processing chat request' },
      { status: 500 },
    );
  }
};
