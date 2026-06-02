-- Force first-login password changes for HRD-created users.
alter table public.profiles
add column if not exists must_change_password boolean not null default false;

create index if not exists idx_profiles_must_change_password
on public.profiles (must_change_password)
where must_change_password = true;
