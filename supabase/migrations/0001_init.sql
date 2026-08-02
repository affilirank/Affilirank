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
