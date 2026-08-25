create table if not exists user_profiles (
  user_id  text primary key,
  email    text not null,
  date_of_birth text,
  star_sign     text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Optional: auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();
