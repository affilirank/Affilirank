-- ---------------------------------------------------------------------------
-- lifetimedealsbundle.com — schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ---------------------------------------------------------------------------

-- Products (deals) that appear in the stream.
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  subtitle        text,
  description     text,
  highlights      text[] default array[]::text[],
  category        text,
  hero_image      text,
  video_url       text,
  video_type      text check (video_type in ('youtube', 'vimeo', 'mp4', 'iframe')),
  deal_tag        text,
  tag_style       text check (tag_style in ('hot', 'popular', 'lifetime', 'new')),
  coupon_code     text,
  price           numeric,
  original_price  numeric,
  currency        text default 'USD',
  affiliate_url   text not null,
  source_url      text,
  expiration_date timestamptz,
  countdown_enabled boolean default true,
  featured        boolean default false,
  sort_order      int default 0,
  published       boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists products_published_idx  on public.products (published);
create index if not exists products_category_idx   on public.products (category);
create index if not exists products_slug_idx       on public.products (slug);

-- Keep updated_at fresh on any row change.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Row-level security: public reads for published rows only.
alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  using (published = true);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products for all
  using (auth.role() = 'service_role');

-- Realtime: publishing from /admin instantly updates open stream tabs.
alter publication supabase_realtime add table public.products;

-- ---------------------------------------------------------------------------
-- Seed a couple of demo deals so the stream is never empty.
-- ---------------------------------------------------------------------------
insert into public.products (
  slug, title, subtitle, description, highlights, category, hero_image,
  video_url, video_type, deal_tag, tag_style, price, original_price,
  currency, affiliate_url, source_url, expiration_date, countdown_enabled,
  featured, sort_order, published
) values
(
  'neuralpulse-ai-lifetime-license',
  'NeuralPulse AI',
  'Full AI writing suite — lifetime license',
  'NeuralPulse AI writes blog posts, ad copy, emails and product descriptions at scale. One payment, lifetime access, unlimited generations.',
  array['Lifetime access with unlimited generations', '40+ high-converting copywriting templates', 'Brand voice cloning for consistent tone'],
  'ai-tools',
  'https://picsum.photos/seed/neuralpulse/900/1600',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'mp4', '70% OFF', 'hot',
  49, 297, 'USD',
  'https://www.jvzoo.com/b/7654321/0',
  'https://www.jvzoo.com/b/7654321/0',
  now() + interval '3 days', true, true, 10, true
),
(
  'rankforge-pro-unlimited-seo',
  'RankForge Pro',
  'Unlimited keyword & rank tracking',
  'RankForge Pro tracks thousands of keywords across Google, tracks competitors, and fires automated daily ranking reports straight to your inbox.',
  array['Track unlimited keywords & 50+ competitors', 'Automated daily rank reports to email', 'Lifetime access, no monthly fees'],
  'seo',
  'https://picsum.photos/seed/rankforge/900/1600',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'mp4', 'Lifetime Deal', 'lifetime',
  79, 199, 'USD',
  'https://www.jvzoo.com/b/7654322/0',
  'https://www.jvzoo.com/b/7654322/0',
  now() + interval '7 days', true, false, 20, true
)
on conflict (slug) do nothing;
-- ---------------------------------------------------------------------------
-- Analytics events table (optional, best-effort).
-- Written by POST /api/events. Query it from the admin dashboard or your BI
-- tool. GA4 + Meta Pixel remain the primary analytics sources.
-- ---------------------------------------------------------------------------

create table if not exists public.deal_events (
  id         bigint generated always as identity primary key,
  event      text not null,
  payload    jsonb default '{}'::jsonb,
  page_url   text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists deal_events_event_idx  on public.deal_events (event);
create index if not exists deal_events_created_idx on public.deal_events (created_at desc);

alter table public.deal_events enable row level security;

-- Inserts come from the API route using the service role key.
drop policy if exists "deal_events_service_only" on public.deal_events;
create policy "deal_events_service_only"
  on public.deal_events for all
  using (auth.role() = 'service_role');
-- ---------------------------------------------------------------------------
-- lifetimedealsbundle.com — auto-generated SEO blog posts
-- ---------------------------------------------------------------------------

-- Allow the existing products table to store GIF previews too.
alter table public.products drop constraint if exists products_video_type_check;
alter table public.products add constraint products_video_type_check
  check (video_type in ('youtube', 'vimeo', 'mp4', 'iframe', 'gif'));

-- One blog post per deal. Content is generated server-side from the deal's
-- fields (see src/lib/blog-generator.ts) and written on every deal save, so
-- every affiliate CTA inside the post uses the deal's real affiliate URL.
create table if not exists public.blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  deal_id             uuid unique references public.products (id) on delete cascade,
  slug                text unique not null,
  title               text not null,
  excerpt             text,
  cover_image         text,
  category            text,
  keywords            text[] default array[]::text[],
  reading_time_minutes int default 5,
  published           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  sections            jsonb default '[]'::jsonb,
  faq                 jsonb default '[]'::jsonb
);

create index if not exists blog_posts_published_idx on public.blog_posts (published);
create index if not exists blog_posts_deal_id_idx   on public.blog_posts (deal_id);
create index if not exists blog_posts_slug_idx      on public.blog_posts (slug);

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
  on public.blog_posts for select
  using (published = true);

drop policy if exists "blog_posts_admin_all" on public.blog_posts;
create policy "blog_posts_admin_all"
  on public.blog_posts for all
  using (auth.role() = 'service_role');

-- Publishing a deal also surfaces its blog to open tabs.
alter publication supabase_realtime add table public.blog_posts;
-- ---------------------------------------------------------------------------
-- affilirank — licensing settings store
-- ---------------------------------------------------------------------------

-- Single-row key/value settings table used for license key management.
-- The admin portal reads/writes the list of activated RSA-signed license keys;
-- the app resolves them into a LicenseState (tier + granted features).
create table if not exists public.settings (
  id            int primary key default 1,
  license_keys  jsonb not null default '[]'::jsonb,
  updated_at    timestamptz default now()
);

-- Seed the singleton row so reads are never empty.
insert into public.settings (id, license_keys)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read"
  on public.settings for select
  using (true);

drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all"
  on public.settings for all
  using (auth.role() = 'service_role');
