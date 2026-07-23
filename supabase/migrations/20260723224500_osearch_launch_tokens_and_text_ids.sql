-- Launch tokens for constellation SSO + TEXT chat ids for OSearch hex ids.
-- Applied remotely 2026-07-23 as migration `osearch_launch_tokens_and_text_ids`.

CREATE TABLE IF NOT EXISTS public.ao_ecosystem_launch_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  app_id TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES public.ao_orgs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ao_ecosystem_launch_tokens_expires_idx
  ON public.ao_ecosystem_launch_tokens (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.ao_ecosystem_launch_tokens ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ao_ecosystem_launch_tokens TO service_role;

ALTER TABLE public.os_messages DROP CONSTRAINT IF EXISTS os_messages_chat_id_fkey;
ALTER TABLE public.os_uploads DROP CONSTRAINT IF EXISTS os_uploads_chat_id_fkey;

ALTER TABLE public.os_chats
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.os_messages
  ALTER COLUMN chat_id TYPE TEXT USING chat_id::text;

ALTER TABLE public.os_uploads
  ALTER COLUMN chat_id TYPE TEXT USING chat_id::text;

ALTER TABLE public.os_messages
  ADD CONSTRAINT os_messages_chat_id_fkey
  FOREIGN KEY (chat_id) REFERENCES public.os_chats(id) ON DELETE CASCADE;

ALTER TABLE public.os_uploads
  ADD CONSTRAINT os_uploads_chat_id_fkey
  FOREIGN KEY (chat_id) REFERENCES public.os_chats(id) ON DELETE SET NULL;
