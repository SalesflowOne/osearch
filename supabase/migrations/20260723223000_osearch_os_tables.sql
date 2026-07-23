-- OSearch satellite tables on the shared One OS / OWeb Supabase project.
-- Applied remotely 2026-07-23 as migration `osearch_os_tables`.
-- created_by is TEXT to match ao_org_members.user_id / auth.uid()::text.

CREATE TABLE IF NOT EXISTS public.os_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.ao_orgs(id) ON DELETE CASCADE,
  created_by TEXT,
  title TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  optimization_mode TEXT NOT NULL DEFAULT 'balanced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS os_chats_org_updated_idx ON public.os_chats (org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS os_chats_created_by_idx ON public.os_chats (created_by);

CREATE TABLE IF NOT EXISTS public.os_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.os_chats(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.ao_orgs(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'answering',
  model TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, message_id)
);

CREATE INDEX IF NOT EXISTS os_messages_chat_idx ON public.os_messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS os_messages_org_idx ON public.os_messages (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.os_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.ao_orgs(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.os_chats(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS os_uploads_org_idx ON public.os_uploads (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.os_guest_search_usage (
  user_id TEXT PRIMARY KEY,
  searches_used INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.os_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_guest_search_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "os_chats_member_select" ON public.os_chats;
CREATE POLICY "os_chats_member_select" ON public.os_chats
  FOR SELECT TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_chats_member_insert" ON public.os_chats;
CREATE POLICY "os_chats_member_insert" ON public.os_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    public.ao_is_org_member(org_id, auth.uid()::text)
    AND (created_by IS NULL OR created_by = auth.uid()::text)
  );

DROP POLICY IF EXISTS "os_chats_member_update" ON public.os_chats;
CREATE POLICY "os_chats_member_update" ON public.os_chats
  FOR UPDATE TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text))
  WITH CHECK (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_chats_member_delete" ON public.os_chats;
CREATE POLICY "os_chats_member_delete" ON public.os_chats
  FOR DELETE TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_messages_member_select" ON public.os_messages;
CREATE POLICY "os_messages_member_select" ON public.os_messages
  FOR SELECT TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_messages_member_write" ON public.os_messages;
CREATE POLICY "os_messages_member_write" ON public.os_messages
  FOR ALL TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text))
  WITH CHECK (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_uploads_member_select" ON public.os_uploads;
CREATE POLICY "os_uploads_member_select" ON public.os_uploads
  FOR SELECT TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_uploads_member_write" ON public.os_uploads;
CREATE POLICY "os_uploads_member_write" ON public.os_uploads
  FOR ALL TO authenticated
  USING (public.ao_is_org_member(org_id, auth.uid()::text))
  WITH CHECK (public.ao_is_org_member(org_id, auth.uid()::text));

DROP POLICY IF EXISTS "os_guest_usage_own" ON public.os_guest_search_usage;
CREATE POLICY "os_guest_usage_own" ON public.os_guest_search_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_uploads TO authenticated;
GRANT SELECT ON public.os_guest_search_usage TO authenticated;
GRANT ALL ON public.os_chats TO service_role;
GRANT ALL ON public.os_messages TO service_role;
GRANT ALL ON public.os_uploads TO service_role;
GRANT ALL ON public.os_guest_search_usage TO service_role;
