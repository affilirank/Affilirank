-- ---------------------------------------------------------------------------
-- 0008_settings_youtube.sql — YouTube autopublish columns on settings
--
-- These columns were added to the original DB directly via the SQL editor and
-- never captured in a migration. youtube_auth stores the connected channel's
-- OAuth tokens; autopublish stores the Auto-Publish settings + the
-- purchaser-supplied Gemini API key. Both are per-tenant via the settings row.
-- ---------------------------------------------------------------------------

alter table public.settings
  add column if not exists youtube_auth jsonb;

alter table public.settings
  add column if not exists autopublish jsonb default '{}'::jsonb;
