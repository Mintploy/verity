-- From a logged flag to an offer to check him. See docs/UPSELL_TRIGGERS.md.
-- Applied 2026-09-19.

-- Measurement. Tier and stage only: never the flag, never the man.
create table if not exists public.upsell_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  tier       text not null check (tier in ('safety', 'strong', 'stacked')),
  stage      text not null check (stage in ('before', 'during', 'after')),
  plan       text not null,
  outcome    text not null check (outcome in ('shown', 'dismissed', 'suppressed', 'checkout_started', 'purchased', 'reminded')),
  created_at timestamptz not null default now()
);
create index if not exists idx_upsell_events_user_recent on public.upsell_events (user_id, created_at desc);
alter table public.upsell_events enable row level security;
revoke all on public.upsell_events from anon, authenticated;

-- The once-per-man-per-date lock. A lock, not a log: nothing about the flag.
create table if not exists public.upsell_offers (
  user_id     text not null,
  file_id     uuid not null,
  date_number integer not null,
  tier        text not null check (tier in ('strong', 'stacked')),
  created_at  timestamptz not null default now(),
  primary key (user_id, file_id, date_number)
);
alter table public.upsell_offers enable row level security;
revoke all on public.upsell_offers from anon, authenticated;

-- "Don't suggest this for him." A preference on his file, hers to set.
alter table public.his_files add column if not exists no_offers boolean not null default false;

-- The $19 credit toward a monthly membership: when she bought a single report,
-- and when the credit was spent. Server-only columns; no grants to members.
alter table public.user_profiles
  add column if not exists single_purchased_at timestamptz,
  add column if not exists credit_offer_used_at timestamptz;

-- "Remind me after the date": a reminder with no report, tied to his file.
alter table public.search_reminders
  add column if not exists kind text not null default 'report' check (kind in ('report', 'after_date')),
  add column if not exists file_id uuid;
create index if not exists idx_search_reminders_after_date on public.search_reminders (user_id, file_id) where kind = 'after_date';

-- Rollback:
--   drop table if exists public.upsell_events; drop table if exists public.upsell_offers;
--   alter table public.his_files drop column if exists no_offers;
--   alter table public.user_profiles drop column if exists single_purchased_at, drop column if exists credit_offer_used_at;
--   alter table public.search_reminders drop column if exists kind, drop column if exists file_id;
