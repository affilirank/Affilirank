-- ---------------------------------------------------------------------------
-- affilirank — Google OAuth credentials stored in settings (no Vercel redeploy)
-- ---------------------------------------------------------------------------

-- Admins paste their Google Cloud client ID + secret in the Auto-Publish tab.
-- They are persisted here (jsonb) so neither the Next.js app nor the Python
-- upload worker needs GOOGLE_CLIENT_ID/SECRET as deployment env vars. The
-- worker already reads youtube_auth from this table, so it reads google_auth
-- here too. Env vars still win when both exist (they override DB values).
alter table public.settings
  add column if not exists google_auth jsonb;
