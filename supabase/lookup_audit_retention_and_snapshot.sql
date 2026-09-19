-- Retention for lookup_audit, re-keying of deleted accounts, and a snapshot
-- function for the encryption migration.
--
-- Retention: rows are deleted at 24 months. The ip column is nulled at 90
-- days and the rest of the row kept. Both happen in
-- lookup_audit_apply_retention(), run nightly by pg_cron.
--
-- The append-only trigger is kept and narrowed to permit exactly three
-- transitions and nothing else:
--   1. DELETE of a row older than 24 months.
--   2. UPDATE that only sets ip to null, on a row older than 90 days.
--   3. UPDATE that only replaces a readable user_id with a `deleted:` id
--      (account deletion re-keying, see lib/lookups.ts deletedUserId).
-- Every other UPDATE or DELETE still raises.

create or replace function public.lookup_audit_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  probe public.lookup_audit;
begin
  if tg_op = 'DELETE' then
    if old.created_at < now() - interval '24 months' then
      return old;
    end if;
    raise exception 'lookup_audit is append-only (delete permitted only after 24 months)';
  end if;

  -- UPDATE. Build a copy of NEW with the two mutable columns reset to OLD's
  -- values; if anything else differs, refuse.
  probe := new;
  probe.ip := old.ip;
  probe.user_id := old.user_id;
  if probe is distinct from old then
    raise exception 'lookup_audit is append-only (only ip and user_id may change, under the retention and deletion rules)';
  end if;

  if new.ip is distinct from old.ip then
    if new.ip is not null or old.created_at >= now() - interval '90 days' then
      raise exception 'lookup_audit: ip may only be cleared, and only after 90 days';
    end if;
  end if;

  if new.user_id is distinct from old.user_id then
    if new.user_id not like 'deleted:%' or old.user_id like 'deleted:%' then
      raise exception 'lookup_audit: user_id may only change from a readable id to a deleted: id';
    end if;
  end if;

  return new;
end;
$$;

-- The trigger itself is unchanged (before update or delete, for each row).

create or replace function public.lookup_audit_apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ips_cleared integer;
  rows_deleted integer;
begin
  update public.lookup_audit
     set ip = null
   where ip is not null
     and created_at < now() - interval '90 days';
  get diagnostics ips_cleared = row_count;

  delete from public.lookup_audit
   where created_at < now() - interval '24 months';
  get diagnostics rows_deleted = row_count;

  return jsonb_build_object('ips_cleared', ips_cleared, 'rows_deleted', rows_deleted, 'ran_at', now());
end;
$$;

revoke all on function public.lookup_audit_apply_retention() from public, anon, authenticated;
grant execute on function public.lookup_audit_apply_retention() to service_role;

-- Nightly at 03:17 UTC. pg_cron runs the job as the scheduling role
-- (postgres), which owns the table, so the trigger's rules are what govern
-- it, not grants.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'lookup_audit_retention';
select cron.schedule('lookup_audit_retention', '17 3 * * *', $$select public.lookup_audit_apply_retention()$$);

-- ---------------------------------------------------------------------------
-- his_files_snapshot(): a restore point before a rewrite.
--
-- Copies his_files into a new table named with the timestamp, with RLS on and
-- no grants, so the copy is reachable only by the service role. The
-- encryption script calls it before --apply and --rollback. The copy holds
-- whatever his_files held, so after a migration is verified, drop it:
--   drop table public.his_files_snapshot_YYYYMMDD_HH24MISS;
-- ---------------------------------------------------------------------------

create or replace function public.his_files_snapshot()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := 'his_files_snapshot_' || to_char(now() at time zone 'utc', 'YYYYMMDD_HH24MISS');
begin
  execute format('create table public.%I as select * from public.his_files', name);
  execute format('alter table public.%I enable row level security', name);
  execute format('revoke all on public.%I from anon, authenticated', name);
  return name;
end;
$$;

revoke all on function public.his_files_snapshot() from public, anon, authenticated;
grant execute on function public.his_files_snapshot() to service_role;

-- Restore from a snapshot (example, for the encrypted columns only):
--   update public.his_files h
--      set notes = s.notes, dates = s.dates, icks = s.icks, gifts = s.gifts, report_data = s.report_data
--     from public.his_files_snapshot_YYYYMMDD_HH24MISS s
--    where s.id = h.id;

-- Rollback of this file:
--   select cron.unschedule(jobid) from cron.job where jobname = 'lookup_audit_retention';
--   drop function if exists public.lookup_audit_apply_retention();
--   drop function if exists public.his_files_snapshot();
--   (restore the previous lookup_audit_immutable from lookup_audit_and_flags.sql)
