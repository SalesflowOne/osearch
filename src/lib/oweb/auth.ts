import { createServiceSupabase, createUserSupabase } from './supabase';
import { isOwebModeEnabled } from './config';

export type OwebUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

export type OwebWorkspace = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  creditsBalance: number;
};

export type AuthContext = {
  user: OwebUser;
  accessToken: string;
};

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function resolveAuthFromRequest(
  req: Request,
): Promise<AuthContext | null> {
  if (!isOwebModeEnabled()) return null;
  const token = extractBearerToken(req);
  if (!token) return null;

  const client = createUserSupabase(token);
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  const isAnonymous =
    Boolean((data.user as { is_anonymous?: boolean }).is_anonymous) ||
    data.user.app_metadata?.provider === 'anonymous';

  return {
    accessToken: token,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      isAnonymous,
    },
  };
}

export async function listWorkspacesForUser(
  userId: string,
): Promise<OwebWorkspace[]> {
  const admin = createServiceSupabase();
  if (!admin) return [];

  const { data: memberships, error } = await admin
    .from('ao_org_members')
    .select('org_id, ao_orgs(id, name, slug, plan, credits_balance)')
    .eq('user_id', userId);

  if (error || !memberships) {
    console.error('[oweb.auth] listWorkspaces failed', error?.message);
    return [];
  }

  return memberships
    .map((row: any) => {
      const org = Array.isArray(row.ao_orgs) ? row.ao_orgs[0] : row.ao_orgs;
      if (!org) return null;
      return {
        id: org.id as string,
        name: org.name as string,
        slug: org.slug as string,
        plan: (org.plan as string) || 'free',
        creditsBalance: Number(org.credits_balance ?? 0),
      } satisfies OwebWorkspace;
    })
    .filter(Boolean) as OwebWorkspace[];
}

export async function assertWorkspaceMembership(
  userId: string,
  orgId: string,
): Promise<OwebWorkspace | null> {
  const workspaces = await listWorkspacesForUser(userId);
  return workspaces.find((w) => w.id === orgId) || null;
}

export function requireWorkspaceId(req: Request): string | null {
  return (
    req.headers.get('x-workspace-id') ||
    req.headers.get('X-Workspace-Id') ||
    null
  );
}
