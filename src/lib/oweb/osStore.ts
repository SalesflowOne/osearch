import { createServiceSupabase, createUserSupabase } from './supabase';
import type { SearchSources } from '@/lib/agents/search/types';
import type { Block } from '@/lib/types';

export type OsChatRow = {
  id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  sources: SearchSources[];
  files: { name: string; fileId: string }[];
  optimization_mode: string;
  created_at: string;
  updated_at: string;
};

export async function upsertOsChat(input: {
  accessToken?: string | null;
  id: string;
  orgId: string;
  userId: string;
  title: string;
  sources: SearchSources[];
  files: { name: string; fileId: string }[];
  optimizationMode: string;
}): Promise<void> {
  const client =
    (input.accessToken && createUserSupabase(input.accessToken)) ||
    createServiceSupabase();
  if (!client) return;

  const { error } = await client.from('os_chats').upsert(
    {
      id: input.id,
      org_id: input.orgId,
      created_by: input.userId,
      title: input.title,
      sources: input.sources,
      files: input.files,
      optimization_mode: input.optimizationMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) console.error('[oweb.osStore] upsertOsChat', error.message);
}

export async function insertOsMessage(input: {
  accessToken?: string | null;
  chatId: string;
  orgId: string;
  userId: string;
  messageId: string;
  query: string;
  responseBlocks?: Block[];
  status?: 'answering' | 'completed' | 'error';
  model?: string | null;
  creditsUsed?: number;
}): Promise<void> {
  const client =
    (input.accessToken && createUserSupabase(input.accessToken)) ||
    createServiceSupabase();
  if (!client) return;

  const { error } = await client.from('os_messages').upsert(
    {
      chat_id: input.chatId,
      org_id: input.orgId,
      created_by: input.userId,
      message_id: input.messageId,
      query: input.query,
      response_blocks: input.responseBlocks ?? [],
      status: input.status ?? 'answering',
      model: input.model ?? null,
      credits_used: input.creditsUsed ?? 0,
    },
    { onConflict: 'chat_id,message_id' },
  );

  if (error) console.error('[oweb.osStore] insertOsMessage', error.message);
}

export async function listOsChats(input: {
  accessToken: string;
  orgId: string;
  limit?: number;
}): Promise<OsChatRow[]> {
  const client = createUserSupabase(input.accessToken);
  if (!client) return [];

  const { data, error } = await client
    .from('os_chats')
    .select('*')
    .eq('org_id', input.orgId)
    .order('updated_at', { ascending: false })
    .limit(input.limit ?? 50);

  if (error) {
    console.error('[oweb.osStore] listOsChats', error.message);
    return [];
  }
  return (data as OsChatRow[]) || [];
}
