-- ---------------------------------------------------------------------------
-- 0007_multi_tenant.sql — multi-tenant SaaS isolation
--
-- One shared database serves every white-label customer plus the flagship
-- affilirank.com. Each tenant owns its rows via `tenant_id` on every data
-- table; the app always filters by the tenant resolved from the request Host.
--
-- All public reads/writes flow through the app (service-role key). Direct
-- anon/authenticated REST access is revoked here so no tenant can read
-- another tenant's rows through the public API.
-- ---------------------------------------------------------------------------

-- Tenants (brands). One row per customer domain.
create table if not exists public.tenants (
  id                 uuid primary key default gen_random_uuid(),
  domain             text not null unique,
  name               text not null default '',
  tagline            text not null default '',
  logo_url           text not null default '',
  brand_tag          text not null default '',
  affiliate_id       text not null default '',
  admin_password_hash text not null default '',
  plan               text not null default 'starter',
  status             text not null default 'active',
  show_product_page  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.products   add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.blog_posts add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.deal_events add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.settings   add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

create index if not exists idx_products_tenant   on public.products (tenant_id);
create index if not exists idx_blog_posts_tenant on public.blog_posts (tenant_id);
create index if not exists idx_deal_events_tenant on public.deal_events (tenant_id);

-- Flagship tenant: affilirank.com becomes tenant #1 on the platform.
insert into public.tenants (id, domain, name, tagline, brand_tag, affiliate_id, plan, status, show_product_page)
values (
  '00000000-0000-0000-0000-000000000001',
  'affilirank.com',
  'AffiliRank',
  'Rank first. Earn on autopilot.',
  'affiliate deal engine',
  '3582897',
  'unlimited',
  'active',
  true
)
on conflict (domain) do nothing;

-- Backfill existing rows into the flagship tenant.
update public.products   set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.blog_posts set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.deal_events set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.settings   set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;

alter table public.products   alter column tenant_id set not null;
alter table public.blog_posts alter column tenant_id set not null;
alter table public.settings   alter column tenant_id set not null;

-- settings was a singleton keyed on id=1; make tenant_id the row key so every
-- white-label tenant gets its own settings row (the app upserts on tenant_id).
alter table public.settings drop constraint if exists settings_pkey;
alter table public.settings drop column if exists id;
alter table public.settings add primary key (tenant_id);

-- RLS hardening: every read/write goes through the app (service role). Direct
-- anon/authenticated access is revoked so tenants can't reach each other via
-- the public REST API.
alter table public.tenants enable row level security;

drop policy if exists "tenants_service_only" on public.tenants;
create policy "tenants_service_only" on public.tenants for all
  using (auth.role() = 'service_role');

revoke all on public.products    from anon, authenticated;
revoke all on public.blog_posts  from anon, authenticated;
revoke all on public.deal_events from anon, authenticated;
revoke all on public.settings    from anon, authenticated;
revoke all on public.tenants     from anon, authenticated;

-- Realtime broadcast is not tenant-safe with a single anon key; the stream
-- refreshes by polling instead.
alter publication supabase_realtime drop table public.products;
alter publication supabase_realtime drop table public.blog_posts;
