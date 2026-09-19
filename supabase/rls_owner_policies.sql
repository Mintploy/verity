-- Row Level Security keyed to the email claim of a JWT we mint per request.
--
-- Our user_id is an email string, not a Supabase Auth uuid, so the policies
-- read the raw `email` claim from request.jwt.claims rather than auth.uid().
-- The claim is wrapped in a scalar subquery so Postgres evaluates it once per
-- query instead of once per row. lib/supabase.ts lowercases the claim to match
-- normalizeEmail() in lib/auth.ts; user_id was stored lowercased by the same
-- function, so the comparison is exact.
--
-- The previous policies compared user_id to current_setting('app.user_id'),
-- which nothing ever set. They denied everything and the service role
-- bypassed them, so no row was ever protected by RLS. This replaces them.
--
-- SECURITY DEFINER functions here take no user identifier. They read the
-- email claim themselves, so a member reaching them over PostgREST can only
-- act on her own row. Every definer function sets search_path = '' and
-- schema-qualifies what it touches.

-- ---------------------------------------------------------------------------
-- Columns added in this pass
-- ---------------------------------------------------------------------------

-- Her data key, wrapped under VERITY_MASTER_KEY. See lib/crypto.ts.
alter table public.user_profiles
  add column if not exists data_key_enc text;

-- How many dates she has logged. Plaintext on purpose: `dates` itself is
-- encrypted, and the same-subject flag rule needs to know whether a journal
-- relationship exists without decrypting anything. Maintained by saveHisFile.
alter table public.his_files
  add column if not exists date_count integer not null default 0;

-- A soft flag is recorded for review but does not block lookups.
alter table public.account_flags
  add column if not exists blocking boolean not null default true;

-- ---------------------------------------------------------------------------
-- Owner policies
-- ---------------------------------------------------------------------------

drop policy if exists users_own_files on public.his_files;
drop policy if exists users_own_profile on public.user_profiles;
drop policy if exists users_own_wrapped on public.verity_wrapped;
drop policy if exists public_wrapped_read on public.verity_wrapped;

drop policy if exists his_files_owner on public.his_files;
create policy his_files_owner on public.his_files
  for all to authenticated
  using ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id)
  with check ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id);

drop policy if exists user_profiles_owner on public.user_profiles;
create policy user_profiles_owner on public.user_profiles
  for all to authenticated
  using ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id)
  with check ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id);

drop policy if exists verity_wrapped_owner on public.verity_wrapped;
create policy verity_wrapped_owner on public.verity_wrapped
  for all to authenticated
  using ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id)
  with check ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id);

drop policy if exists search_reminders_owner on public.search_reminders;
create policy search_reminders_owner on public.search_reminders
  for all to authenticated
  using ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id)
  with check ((select current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_id);

-- ---------------------------------------------------------------------------
-- Grants. Nothing for anon. Members get their own rows through the policies
-- above, minus the billing columns on user_profiles, which only the webhook
-- (service role) and consume_search() below may write.
-- ---------------------------------------------------------------------------

revoke all on public.his_files, public.user_profiles, public.verity_wrapped, public.search_reminders from anon;

grant select, insert, update, delete on public.his_files to authenticated;
grant select, insert, update, delete on public.verity_wrapped to authenticated;
grant select, insert, update, delete on public.search_reminders to authenticated;

revoke all on public.user_profiles from authenticated;
grant select, delete on public.user_profiles to authenticated;
grant insert (user_id, email, date_of_birth, star_sign, data_key_enc) on public.user_profiles to authenticated;
-- user_id is in the update list because PostgREST's upsert sets every column
-- in the payload, the conflict key included; the policy's WITH CHECK still
-- refuses any value other than her own claim.
grant update (user_id, email, date_of_birth, star_sign, data_key_enc, updated_at) on public.user_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- consume_search(): spend one monthly lookup, atomically, for the caller.
--
-- Takes no argument. The member is whoever the JWT says, so nobody can spend
-- another member's quota by naming her. A single UPDATE ... WHERE carries the
-- limit check, which closes the read-then-write race the app code had.
-- Returns {allowed, remaining, plan}. No profile means not allowed.
-- ---------------------------------------------------------------------------

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

  if not found then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'plan', null);
  end if;

  v_limit := case when v_plan = 'single' then 1 else 15 end;

  -- A new month resets the count, except for the single-report plan, which
  -- is a lifetime cap of one.
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

revoke all on function public.consume_search() from public, anon;
grant execute on function public.consume_search() to authenticated;

-- ---------------------------------------------------------------------------
-- founding_count(): how many founding memberships exist. One integer, no
-- argument, no member data. Public because the checkout page shows it before
-- sign-in.
-- ---------------------------------------------------------------------------

create or replace function public.founding_count()
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::integer from public.user_profiles where plan = 'founding';
$$;

revoke all on function public.founding_count() from public;
grant execute on function public.founding_count() to anon, authenticated;

-- Rollback:
--   drop function if exists public.consume_search();
--   drop function if exists public.founding_count();
--   drop policy if exists his_files_owner on public.his_files;
--   drop policy if exists user_profiles_owner on public.user_profiles;
--   drop policy if exists verity_wrapped_owner on public.verity_wrapped;
--   drop policy if exists search_reminders_owner on public.search_reminders;
--   (the old app.user_id policies were dead and are not worth restoring)
--   alter table public.account_flags drop column if exists blocking;
--   alter table public.his_files drop column if exists date_count;
--   alter table public.user_profiles drop column if exists data_key_enc;
--     (only after scripts/encrypt-journal.ts --rollback has run)
