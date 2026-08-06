-- AffiliRank Auto-Publish engine + bundle affiliate links
-- Run this once in Supabase Dashboard > SQL Editor > New query, then Run.

-- 1. Settings table: store YouTube OAuth tokens + autopublish settings as JSON
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS youtube_auth jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS autopublish jsonb DEFAULT NULL;

-- 2. Products table: bundle affiliate link + full funnel links + auto-publish status
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bundle_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS funnel_links jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS youtube_video_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_post_status text DEFAULT NULL;

-- 3. Default autopublish settings row
INSERT INTO public.settings (id, autopublish)
  VALUES (1, '{"enabled":false,"interval":"hourly","format":"short","thumbnail_tone":"violet"}')
  ON CONFLICT (id) DO NOTHING;
