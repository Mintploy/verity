-- Lookup audit log and account flags.
--
-- lookup_audit is append-only. Every attempt to run a lookup writes one row,
-- whether or not it went ahead, so the log answers "who tried to look up whom,
-- from where, and what happened" without storing the input itself: the input
-- and the resolved subject are stored as keyed hashes (HMAC-SHA256 with
-- LOOKUP_HASH_SECRET, see lib/lookups.ts). A plain hash of a ten-digit phone
-- number is reversible by enumeration; a keyed hash is not without the key.
--
-- Rows are never updated or deleted, by trigger, and the table has RLS enabled
-- with no policies, so only the service role can touch it. Account deletion
-- deliberately leaves these rows in place (abuse-prevention retention).

create table if not exists lookup_audit (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  -- HMAC of the normalized input she submitted (phone digits, name+location,
  -- email, address, or the record id behind a picker/relative token).
  input_hash   text not null,
  -- HMAC of the record id the lookup resolved to, when one was resolved.
  subject_hash text,
  input_kind   text not null check (input_kind in ('phone', 'name', 'email', 'address', 'candidate', 'relative', 'picker')),
  ip           text,
  -- True only when a monthly-quota search was actually spent.
  consumed     boolean not null default false,
  -- What happened: completed | completed_unknown_age (no age or DOB on the
  -- record, so the under-18 guard had nothing to check) | picker | quota |
  -- daily_cap | flagged | minor | distinct_subjects | error
  outcome      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_lookup_audit_user_time
  on lookup_audit (user_id, created_at desc);
create index if not exists idx_lookup_audit_user_subject
  on lookup_audit (user_id, subject_hash, created_at desc);
create index if not exists idx_lookup_audit_user_input
  on lookup_audit (user_id, input_hash, created_at desc);

alter table lookup_audit enable row level security;
revoke all on lookup_audit from anon, authenticated;

create or replace function lookup_audit_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'lookup_audit is append-only';
end;
$$;

drop trigger if exists lookup_audit_no_update on lookup_audit;
create trigger lookup_audit_no_update
  before update or delete on lookup_audit
  for each row execute function lookup_audit_immutable();

-- An account under review. Any row with cleared_at null blocks lookups.
-- Clearing is a manual SQL update for now:
--   update account_flags set cleared_at = now(), cleared_by = 'you', note = '...'
--    where user_id = '...' and cleared_at is null;
create table if not exists account_flags (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  reason     text not null check (reason in ('repeat_subject', 'distinct_subjects', 'minor_subject', 'manual')),
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by text,
  note       text
);

create index if not exists idx_account_flags_active
  on account_flags (user_id) where cleared_at is null;

alter table account_flags enable row level security;
revoke all on account_flags from anon, authenticated;

-- Retention and the narrowed trigger live in lookup_audit_retention_and_snapshot.sql.

-- Rollback:
--   drop trigger if exists lookup_audit_no_update on lookup_audit;
--   drop function if exists lookup_audit_immutable();
--   drop table if exists account_flags;
--   drop table if exists lookup_audit;
