-- Applied 2026-09-08. Two changes to his_files:
--
-- 1. A file is now either a dating entry or a plain safety check, so the
--    questionnaire can stop asking a marketplace seller who paid for dinner.
-- 2. Saving the same man twice updates one row instead of creating a second.

alter table his_files
  add column if not exists file_type text not null default 'dating',
  add column if not exists meetup_location text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'his_files_file_type_check') then
    alter table his_files
      add constraint his_files_file_type_check check (file_type in ('dating', 'safety'));
  end if;
end $$;

-- Dedupe key. Phones arrive formatted differently depending on where they were
-- typed ("(310) 266-9889", "+13102669889", "3102669889"), so the raw column
-- cannot be compared directly. Generated rather than app-maintained so it can
-- never drift from `phone`. NANP numbers keep their last 10 digits, so a
-- leading country code does not read as a different person.
-- lib/hisfile.ts:normalizePhone() mirrors this exactly — change both together.
alter table his_files
  add column if not exists phone_normalized text
  generated always as (
    nullif(
      case
        when length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) = 11
         and left(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 1) = '1'
        then right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10)
        else regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
      end,
      ''
    )
  ) stored;

create index if not exists idx_his_files_user_phone
  on his_files (user_id, phone_normalized);

-- Fold existing duplicate groups into one row each. The earliest row is kept:
-- it carries the original created_at and whatever was set on it first. Values
-- fill in from newer rows only where the kept row is blank, so nothing typed is
-- lost. The report pointer is the exception — the newest research wins.
do $$
declare
  g record;
  src record;
begin
  for g in
    select user_id, phone_normalized,
           (array_agg(id order by researched_at asc, created_at asc))[1] as keep_id
      from his_files
     where phone_normalized is not null
     group by user_id, phone_normalized
    having count(*) > 1
  loop
    for src in
      select * from his_files
       where user_id = g.user_id and phone_normalized = g.phone_normalized
         and id <> g.keep_id
       order by researched_at desc, created_at desc
    loop
      update his_files k set
        nickname            = coalesce(k.nickname, src.nickname),
        full_name           = coalesce(k.full_name, src.full_name),
        date_of_birth       = coalesce(k.date_of_birth, src.date_of_birth),
        star_sign           = coalesce(k.star_sign, src.star_sign),
        status              = coalesce(k.status, src.status),
        where_we_met        = coalesce(k.where_we_met, src.where_we_met),
        meetup_location     = coalesce(k.meetup_location, src.meetup_location),
        met_on_app          = coalesce(k.met_on_app, src.met_on_app),
        met_date            = coalesce(k.met_date, src.met_date),
        first_date_location = coalesce(k.first_date_location, src.first_date_location),
        first_date_date     = coalesce(k.first_date_date, src.first_date_date),
        first_date_paid     = coalesce(k.first_date_paid, src.first_date_paid),
        accurate_salary     = coalesce(k.accurate_salary, src.accurate_salary),
        generosity_rating   = coalesce(k.generosity_rating, src.generosity_rating),
        his_finsta          = coalesce(k.his_finsta, src.his_finsta),
        notes               = coalesce(k.notes, src.notes),
        compatibility_score = coalesce(k.compatibility_score, src.compatibility_score),
        compatibility_summary = coalesce(k.compatibility_summary, src.compatibility_summary),
        -- Empty jsonb arrays are not null, so coalesce would keep the empty one.
        icks  = case when jsonb_array_length(coalesce(k.icks,  '[]'::jsonb)) = 0 then src.icks  else k.icks  end,
        gifts = case when jsonb_array_length(coalesce(k.gifts, '[]'::jsonb)) = 0 then src.gifts else k.gifts end
      where k.id = g.keep_id;
    end loop;

    update his_files k
       set report_id     = newest.report_id,
           safety_score  = newest.safety_score,
           report_data   = coalesce(newest.report_data, k.report_data),
           researched_at = newest.researched_at
      from (
        select report_id, safety_score, report_data, researched_at
          from his_files
         where user_id = g.user_id and phone_normalized = g.phone_normalized
         order by researched_at desc, created_at desc
         limit 1
      ) as newest
     where k.id = g.keep_id;

    delete from his_files
     where user_id = g.user_id and phone_normalized = g.phone_normalized
       and id <> g.keep_id;
  end loop;
end $$;

-- Partial, because entries added by hand may have no phone and must not
-- collide with each other on a null key.
create unique index if not exists uniq_his_files_user_phone
  on his_files (user_id, phone_normalized)
  where phone_normalized is not null;
