-- Her green flags and red flags, set in Settings next to her birthday. They
-- seed the one-tap chips under "During" on a date card. Plain lists of short
-- strings, member-editable through the same column-limited grants as her
-- date of birth. Applied 2026-09-19.

alter table public.user_profiles
  add column if not exists green_flags jsonb not null default '[]'::jsonb,
  add column if not exists red_flags jsonb not null default '[]'::jsonb;

grant insert (green_flags, red_flags) on public.user_profiles to authenticated;
grant update (green_flags, red_flags) on public.user_profiles to authenticated;

-- Rollback:
--   alter table public.user_profiles drop column if exists green_flags, drop column if exists red_flags;
