-- ============================================================
-- MIGRATION 026: Employee intake (Konfirmasi Penawaran Kerja & Data PKWT)
-- Adds profiles.nik and employee_intake table for recruitment data
-- captured from the Google Form confirmation flow.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles.nik (Nomor Induk Kependudukan)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists nik text;

create unique index if not exists idx_profiles_nik
on public.profiles(nik)
where nik is not null;

-- ------------------------------------------------------------
-- 2. employee_intake (1:1 with profiles)
-- ------------------------------------------------------------
create table if not exists public.employee_intake (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles(id) on delete cascade,
  emergency_name      text,
  emergency_relation  text,
  emergency_phone     text,
  uniform_size        text check (uniform_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  proposed_start_date date,
  start_date_note     text,
  ktp_url             text,
  photo_url           text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_employee_intake_user_id
on public.employee_intake(user_id);

drop trigger if exists trg_employee_intake_updated_at on public.employee_intake;
create trigger trg_employee_intake_updated_at
before update on public.employee_intake
for each row execute function update_updated_at_column();

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------
alter table public.employee_intake enable row level security;

drop policy if exists "employee_intake_select_self" on public.employee_intake;
create policy "employee_intake_select_self" on public.employee_intake
for select using (user_id = auth.uid());

drop policy if exists "employee_intake_select_hrd_admin" on public.employee_intake;
create policy "employee_intake_select_hrd_admin" on public.employee_intake
for select using (is_hrd() or is_admin());

drop policy if exists "employee_intake_write_hrd_admin" on public.employee_intake;
create policy "employee_intake_write_hrd_admin" on public.employee_intake
for all using (is_hrd() or is_admin())
with check (is_hrd() or is_admin());

grant select, insert, update, delete on public.employee_intake to authenticated;
