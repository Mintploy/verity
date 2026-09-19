-- Two additive changes. Safe to apply before the code that uses them deploys.
--
-- 1. search_reports: the server-side copy of a report she just ran, encrypted
--    under her data key, so that saving a report to His File is a server code
--    path (report_id in, report_data and safety_score looked up here) and the
--    browser never supplies either. Rows expire after 30 days; the search
--    route purges a member's expired rows each time she searches.
--
-- 2. his_files identity HMACs: keyed hashes of the normalized phone, full
--    name and nickname, computed in app code (lib/lookups.ts hmacHisFile,
--    namespaces "hisfile-phone:" and "hisfile-name:", so they are not joinable
--    to lookup_audit's "phone:" hashes). They take over from the plaintext
--    phone_normalized generated column as the dedupe key. The old column and
--    its indexes are dropped by his_files_drop_phone_normalized.sql, only
--    after scripts/encrypt-identity.ts has backfilled every row.

-- ---------------------------------------------------------------------------
-- search_reports
-- ---------------------------------------------------------------------------

create table if not exists public.search_reports (
  user_id      text not null,
  report_id    text not null,
  -- v1.<iv>.<tag>.<ct> under her data key. See lib/crypto.ts.
  report_enc   text not null,
  safety_score text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days',
  primary key (user_id, report_id)
);

alter table public.search_reports enable row level security;

drop policy if exists search_reports_owner on public.search_reports;
create policy search_reports_owner on public.search_reports
  for all to authenticated
  using ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id)
  with check ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id);

revoke all on public.search_reports from anon;
grant select, insert, update, delete on public.search_reports to authenticated;

-- ---------------------------------------------------------------------------
-- his_files identity HMACs
-- ---------------------------------------------------------------------------

alter table public.his_files
  add column if not exists phone_hmac text,
  add column if not exists name_hmac text,
  add column if not exists nickname_hmac text;

-- Same rule as the old index: one file per member per phone, nulls exempt.
create unique index if not exists uniq_his_files_user_phone_hmac
  on public.his_files (user_id, phone_hmac)
  where phone_hmac is not null;

create index if not exists idx_his_files_user_name_hmac
  on public.his_files (user_id, name_hmac)
  where name_hmac is not null;

create index if not exists idx_his_files_user_nickname_hmac
  on public.his_files (user_id, nickname_hmac)
  where nickname_hmac is not null;

-- Rollback:
--   drop table if exists public.search_reports;
--   drop index if exists uniq_his_files_user_phone_hmac;
--   drop index if exists idx_his_files_user_name_hmac;
--   drop index if exists idx_his_files_user_nickname_hmac;
--   alter table public.his_files drop column if exists phone_hmac,
--     drop column if exists name_hmac, drop column if exists nickname_hmac;
