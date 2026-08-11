-- ---------------------------------------------------------------------------
-- Multi-tenant: make content uniqueness per-tenant, not global.
--
-- Two white-label tenants must be allowed to hold the same slug (e.g. both
-- publish a "campaign-cart-5" deal). The app already dedupes slugs within a
-- tenant (uniqueSlug in src/lib/data.ts) and scopes every lookup by
-- tenant_id, so we replace the global UNIQUE constraints with composite
-- unique indexes on (tenant_id, slug) / (tenant_id, deal_id).
-- ---------------------------------------------------------------------------

alter table public.products
  drop constraint if exists products_slug_key;
create unique index if not exists products_tenant_slug_key
  on public.products (tenant_id, slug);

alter table public.blog_posts
  drop constraint if exists blog_posts_slug_key;
create unique index if not exists blog_posts_tenant_slug_key
  on public.blog_posts (tenant_id, slug);

alter table public.blog_posts
  drop constraint if exists blog_posts_deal_id_key;
create unique index if not exists blog_posts_tenant_deal_key
  on public.blog_posts (tenant_id, deal_id);
