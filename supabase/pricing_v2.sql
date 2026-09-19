-- Pricing v2. Applied 2026-09-19.
--
-- Plans: free (journal only), single ($19, one lookup, never expires),
-- monthly ($39, 10 a month), annual ($349, 10 a month), founding ($199 a
-- year, 10 a month, first 100 only, price locked while active).
--
-- 1. The monthly limit drops from 15 to 10. Anyone already on a plan keeps
--    15 through grandfathered_limit until the webhook sees her next renewal
--    invoice and clears it.
-- 2. The founding cap is a table with 100 numbered slots. A checkout claims
--    a slot under a table lock and holds it for 30 minutes; the webhook
--    confirms it on payment; unconfirmed holds lapse. Two simultaneous
--    checkouts cannot both take slot 100.

alter table public.user_profiles
  add column if not exists grandfathered_limit integer;

update public.user_profiles
   set grandfathered_limit = 15
 where plan in ('founding', 'annual', 'yearly')
   and grandfathered_limit is null;

create or replace function public.consume_search()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := (select current_setting('request.jwt.claims', true)::jsonb ->> 'email');
  v_plan text;
  v_grand integer;
  v_limit integer;
  v_used integer;
  v_reset timestamptz;
  v_now timestamptz := now();
  v_rows integer;
begin
  if v_email is null then
    raise exception 'consume_search: no email claim' using errcode = '42501';
  end if;

  select plan, grandfathered_limit, searches_this_month, searches_reset_at
    into v_plan, v_grand, v_used, v_reset
    from public.user_profiles
   where user_id = v_email
   for update;

  if not found or v_plan is null or v_plan = 'free' then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'plan', v_plan);
  end if;

  v_limit := case when v_plan = 'single' then 1 else coalesce(v_grand, 10) end;

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

-- ---------------------------------------------------------------------------
-- Founding slots
-- ---------------------------------------------------------------------------

create table if not exists public.founding_slots (
  slot           integer primary key check (slot between 1 and 100),
  user_id        text not null unique,
  reserved_until timestamptz,
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.founding_slots enable row level security;
revoke all on public.founding_slots from anon, authenticated;

-- Existing founding members hold a confirmed slot from the start.
insert into public.founding_slots (slot, user_id, confirmed_at)
select row_number() over (order by created_at), user_id, now()
  from public.user_profiles
 where plan = 'founding'
   and user_id not in (select user_id from public.founding_slots)
on conflict do nothing;

/**
 * Take, or refresh, a founding slot for a member. Service role only: called
 * by the checkout route before Stripe opens, and by the webhook if a
 * founding payment arrives without one. Returns the slot, or null when all
 * 100 are taken or held.
 */
create or replace function public.claim_founding_slot(p_user_id text, p_hold interval default interval '30 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot integer;
begin
  lock table public.founding_slots in share row exclusive mode;

  select slot into v_slot from public.founding_slots where user_id = p_user_id;
  if found then
    update public.founding_slots
       set reserved_until = case when confirmed_at is null then now() + p_hold else reserved_until end
     where user_id = p_user_id;
    return v_slot;
  end if;

  delete from public.founding_slots
   where confirmed_at is null and reserved_until < now();

  select min(s) into v_slot
    from generate_series(1, 100) as s
   where s not in (select slot from public.founding_slots);
  if v_slot is null then
    return null;
  end if;

  insert into public.founding_slots (slot, user_id, reserved_until)
  values (v_slot, p_user_id, now() + p_hold);
  return v_slot;
end;
$$;

/** Payment arrived: the slot is hers. Claims one first if the hold lapsed. */
create or replace function public.confirm_founding_slot(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot integer;
begin
  v_slot := public.claim_founding_slot(p_user_id);
  if v_slot is null then
    return null;
  end if;
  update public.founding_slots
     set confirmed_at = coalesce(confirmed_at, now()), reserved_until = null
   where user_id = p_user_id;
  return v_slot;
end;
$$;

revoke all on function public.claim_founding_slot(text, interval) from public, anon, authenticated;
revoke all on function public.confirm_founding_slot(text) from public, anon, authenticated;
grant execute on function public.claim_founding_slot(text, interval) to service_role;
grant execute on function public.confirm_founding_slot(text) to service_role;

-- Places taken: confirmed, or held right now.
create or replace function public.founding_count()
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::integer
    from public.founding_slots
   where confirmed_at is not null
      or reserved_until > now();
$$;

-- Rollback:
--   drop function if exists public.confirm_founding_slot(text);
--   drop function if exists public.claim_founding_slot(text, interval);
--   drop table if exists public.founding_slots;
--   (restore founding_count and consume_search from rls_owner_policies.sql / accounts_free_signup.sql)
--   alter table public.user_profiles drop column if exists grandfathered_limit;
