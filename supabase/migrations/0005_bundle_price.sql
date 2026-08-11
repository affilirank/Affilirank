-- Add bundle_price to products — the larger bundle tier shown next to the
-- front-end price on blog pages and the deal-stream modal.
-- Run this once in the Supabase SQL editor.
alter table public.products add column if not exists bundle_price numeric;
