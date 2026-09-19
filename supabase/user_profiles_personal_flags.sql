-- Her personal standards, sealed under her data key (lib/hisfile.ts
-- PROFILE_ENCRYPTED_FIELDS), and when she finished or skipped the welcome
-- flow. Member-editable through the same column-limited grants as her
-- date of birth. Applied 2026-09-19.
--
--   personal_flags  text, ciphertext of { green: string[], red: string[], version: 1 }
--   onboarded_at    timestamptz, null until the welcome flow is finished or skipped
--
-- The plaintext green_flags / red_flags columns from user_flags.sql are read
-- as a fallback while a member has not yet saved personal_flags, and are
-- cleared on the write that does. They are not dropped here.

alter table public.user_profiles
  add column if not exists personal_flags text,
  add column if not exists onboarded_at timestamptz;

grant insert (personal_flags, onboarded_at) on public.user_profiles to authenticated;
grant update (personal_flags, onboarded_at) on public.user_profiles to authenticated;

-- Rollback:
--   alter table public.user_profiles drop column if exists personal_flags, drop column if exists onboarded_at;
