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
