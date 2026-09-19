-- Step B of the identity migration. DO NOT apply until
-- `npm run identity:encrypt -- --encrypt` has completed for every member.
--
-- Drops the plaintext phone_normalized generated column and its indexes.
-- Guarded: refuses if any row with a phone has no phone_hmac, because that
-- row would silently fall out of dedupe the moment the old key is gone.
-- The guard also refuses if any phone is still plaintext, since the point
-- of dropping the column is that nothing plaintext remains.

do $$
declare
  missing_hmac integer;
  still_plain integer;
begin
  select count(*) into missing_hmac
    from public.his_files
   where phone is not null and phone_hmac is null;
  if missing_hmac > 0 then
    raise exception '% rows have a phone but no phone_hmac. Run scripts/encrypt-identity.ts --backfill first.', missing_hmac;
  end if;

  select count(*) into still_plain
    from public.his_files
   where phone is not null and phone not like 'v1.%';
  if still_plain > 0 then
    raise exception '% rows still hold a plaintext phone. Run scripts/encrypt-identity.ts --encrypt first.', still_plain;
  end if;
end $$;

drop index if exists public.uniq_his_files_user_phone;
drop index if exists public.idx_his_files_user_phone;
alter table public.his_files drop column if exists phone_normalized;

-- Rollback (only meaningful after scripts/encrypt-identity.ts --rollback has
-- restored plaintext phones):
--   alter table public.his_files
--     add column phone_normalized text generated always as (
--       nullif(case
--         when length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) = 11
--          and left(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 1) = '1'
--         then right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10)
--         else regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
--       end, '')) stored;
--   create index idx_his_files_user_phone on public.his_files (user_id, phone_normalized);
--   create unique index uniq_his_files_user_phone on public.his_files (user_id, phone_normalized)
--     where phone_normalized is not null;
