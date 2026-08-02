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
