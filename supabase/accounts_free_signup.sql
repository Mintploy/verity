-- Accounts and paid plans become separate things. Applied 2026-09-19.
--
-- 1. magic_link_requests: one row per magic link asked for, for the sign-up
--    and sign-in abuse limits (5 per email per hour, 20 per IP per hour),
--    counted here so the limit holds across serverless instances. No
--    policies: service role only. Rows are cheap and purged after a day by
--    the same nightly job that trims lookup_audit.
--
-- 2. user_profiles gains identity_verified and stripe_customer_id, both
--    written only by server code paths (webhook, verify-status, the lazy
--    Stripe checks in lib/access.ts). Not in the member column grants.
--
-- 3. consume_search() refuses a profile with no plan. It used to fall
--    through to the 15-a-month limit, which a free account must not get.

create table if not exists public.magic_link_requests (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists idx_magic_link_requests_email_time on public.magic_link_requests (email, created_at desc);
create index if not exists idx_magic_link_requests_ip_time on public.magic_link_requests (ip, created_at desc);
alter table public.magic_link_requests enable row level security;
revoke all on public.magic_link_requests from anon, authenticated;

alter table public.user_profiles
  add column if not exists identity_verified boolean not null default false,
  add column if not exists stripe_customer_id text;

create or replace function public.consume_search()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := (select current_setting('request.jwt.claims', true)::jsonb ->> 'email');
  v_plan text;
  v_limit integer;
  v_used integer;
  v_reset timestamptz;
  v_now timestamptz := now();
  v_rows integer;
begin
  if v_email is null then
    raise exception 'consume_search: no email claim' using errcode = '42501';
  end if;

  select plan, searches_this_month, searches_reset_at
    into v_plan, v_used, v_reset
    from public.user_profiles
   where user_id = v_email
   for update;

  if not found or v_plan is null then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'plan', v_plan);
  end if;

  v_limit := case when v_plan = 'single' then 1 else 15 end;

  if v_plan is distinct from 'single'
     and date_trunc('month', v_reset) <> date_trunc('month', v_now) then
    update public.user_profiles
       set searches_this_month = 1, searches_reset_at = v_now
     where user_id = v_email;
    return jsonb_build_object('allowed', true, 'remaining', v_limit - 1, 'plan', v_plan);
  end if;

  update public.user_profiles
     set searches_this_month = coalesce(searches_this_month, 0) + 1
   where user_id = v_email
     and coalesce(searches_this_month, 0) < v_limit;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'plan', v_plan);
  end if;

  return jsonb_build_object('allowed', true, 'remaining', v_limit - coalesce(v_used, 0) - 1, 'plan', v_plan);
end;
$$;

-- Purge old magic-link rows alongside the audit retention job.
create or replace function public.lookup_audit_apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ips_cleared integer;
  rows_deleted integer;
  links_deleted integer;
begin
  update public.lookup_audit
     set ip = null
   where ip is not null
     and created_at < now() - interval '90 days';
  get diagnostics ips_cleared = row_count;

  delete from public.lookup_audit
   where created_at < now() - interval '24 months';
  get diagnostics rows_deleted = row_count;

  delete from public.magic_link_requests
   where created_at < now() - interval '1 day';
  get diagnostics links_deleted = row_count;

  return jsonb_build_object('ips_cleared', ips_cleared, 'rows_deleted', rows_deleted, 'magic_links_deleted', links_deleted, 'ran_at', now());
end;
$$;

-- Rollback:
--   drop table if exists public.magic_link_requests;
--   alter table public.user_profiles drop column if exists identity_verified, drop column if exists stripe_customer_id;
--   (restore consume_search and lookup_audit_apply_retention from the earlier files)
