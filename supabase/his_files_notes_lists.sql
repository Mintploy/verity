-- Three more lists on his_files, all encrypted under her data key like the
-- journal (lib/hisfile.ts ENCRYPTED_FIELDS). Applied 2026-09-19.
--
--   he_loves     things he likes: his team, his dog's name, his coffee order
--   i_noticed    observations she wants on record
--   dont_forget  things she must not forget before seeing him again

alter table public.his_files
  add column if not exists he_loves jsonb not null default '[]'::jsonb,
  add column if not exists i_noticed jsonb not null default '[]'::jsonb,
  add column if not exists dont_forget jsonb not null default '[]'::jsonb;

-- Rollback:
--   alter table public.his_files drop column if exists he_loves, drop column if exists i_noticed, drop column if exists dont_forget;
