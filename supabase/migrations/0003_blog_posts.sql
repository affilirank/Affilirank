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
