import { createServiceSupabase } from '@/lib/oweb/supabase';
import { isOwebModeEnabled } from '@/lib/oweb/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Accepts a short-lived launch token from OWeb App Store SSO.
 * Token payload is verified via service-role lookup of ao_platform / future
 * ecosystem launch table. For v1 beta we accept `?access_token=` session
 * handoff when OWeb redirects with a Supabase access token + workspace_id.
 */
export async function POST(req: Request) {
  if (!isOwebModeEnabled()) {
    return Response.json({ message: 'OWeb mode disabled' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    access_token?: string;
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
    // Placeholder for Phase 2 hardened launch tokens.
    return Response.json(
      {
        message:
          'launch_token exchange not yet provisioned — use access_token + workspace_id handoff',
      },
      { status: 501 },
    );
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
    // Client stores the Supabase session; this endpoint validates shape only.
    next: '/',
  });
}
