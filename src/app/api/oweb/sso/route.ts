import { createHash } from 'node:crypto';
import { createServiceSupabase } from '@/lib/oweb/supabase';
import { isOwebModeEnabled } from '@/lib/oweb/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Accepts a short-lived launch token from OWeb App Store SSO, or a direct
 * access_token + workspace_id handoff for same-project session transfer.
 */
export async function POST(req: Request) {
  if (!isOwebModeEnabled()) {
    return Response.json({ message: 'OWeb mode disabled' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    workspace_id?: string;
    launch_token?: string;
  };

  if (body.launch_token) {
    const admin = createServiceSupabase();
    if (!admin) {
      return Response.json(
        { message: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 },
      );
    }

    const tokenHash = hashToken(body.launch_token.trim());
    const { data: row, error } = await admin
      .from('ao_ecosystem_launch_tokens')
      .select(
        'id, app_id, org_id, user_id, access_token, refresh_token, expires_at, consumed_at',
      )
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error('[oweb.sso] lookup failed', error.message);
      return Response.json({ message: 'SSO lookup failed' }, { status: 500 });
    }

    if (!row) {
      return Response.json({ message: 'Invalid launch token' }, { status: 401 });
    }
    if (row.consumed_at) {
      return Response.json(
        { message: 'Launch token already used' },
        { status: 401 },
      );
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return Response.json(
        { message: 'Launch token expired' },
        { status: 401 },
      );
    }
    if (row.app_id !== 'osearch') {
      return Response.json(
        { message: 'Launch token is not for OSearch' },
        { status: 403 },
      );
    }

    const { error: consumeError } = await admin
      .from('ao_ecosystem_launch_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null);

    if (consumeError) {
      console.error('[oweb.sso] consume failed', consumeError.message);
      return Response.json({ message: 'SSO consume failed' }, { status: 500 });
    }

    return Response.json({
      ok: true,
      workspace_id: row.org_id,
      access_token: row.access_token,
      refresh_token: row.refresh_token ?? null,
      user_id: row.user_id,
      next: '/',
    });
  }

  if (!body.access_token || !body.workspace_id) {
    return Response.json(
      { message: 'access_token and workspace_id are required' },
      { status: 400 },
    );
  }

  return Response.json({
    ok: true,
    workspace_id: body.workspace_id,
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? null,
    next: '/',
  });
}
