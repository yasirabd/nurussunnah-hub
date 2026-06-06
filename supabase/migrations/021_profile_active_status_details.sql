alter table public.profiles
  add column if not exists active_status_start_date date,
  add column if not exists active_status_end_date date,
  add column if not exists active_status_note text;
