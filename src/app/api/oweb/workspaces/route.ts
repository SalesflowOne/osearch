import {
  isOwebModeEnabled,
  listWorkspacesForUser,
  resolveAuthFromRequest,
} from '@/lib/oweb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isOwebModeEnabled()) {
    return Response.json(
      { enabled: false, workspaces: [], message: 'OWeb mode is not configured' },
      { status: 200 },
    );
  }

  const auth = await resolveAuthFromRequest(req);
  if (!auth) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const workspaces = await listWorkspacesForUser(auth.user.id);
  return Response.json({
    enabled: true,
    user: auth.user,
    workspaces,
  });
}
