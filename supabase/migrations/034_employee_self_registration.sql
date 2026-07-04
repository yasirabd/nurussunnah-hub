-- ============================================================
-- MIGRATION 034: Employee self-registration (pending validation)
-- Public /register captures prospective employees into a staging
-- table. HRD/Admin validate -> becomes real employee; reject -> deleted.
-- ============================================================

create type public.employee_registration_status_enum
  as enum ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

create table public.employee_registrations (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  employee_no      text not null,
  email            text not null,
  phone            text,
  gender           gender_enum not null default 'L',
  marital_status   text,
  birth_place      text,
  birth_date       date,
  last_education   text,
  study_program    text,
  address_ktp      text,
  address_domicile text,
  home_unit_id     uuid references public.units(id) on delete set null,
  employee_status  public.employee_status_enum not null default 'CPTY',
  note             text,
  status           public.employee_registration_status_enum not null default 'MENUNGGU',
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint employee_registrations_no_no_spaces check (employee_no not like '% %')
);

create index idx_employee_registrations_status on public.employee_registrations(status);

drop trigger if exists trg_employee_registrations_updated_at on public.employee_registrations;
create trigger trg_employee_registrations_updated_at
before update on public.employee_registrations
for each row execute function update_updated_at_column();

-- ------------------------------------------------------------
-- RLS: no direct anon/authenticated access. Only HRD/Admin read/manage.
-- Public inserts go exclusively through submit_employee_registration().
-- ------------------------------------------------------------
alter table public.employee_registrations enable row level security;

drop policy if exists "employee_registrations_read_hrd_admin" on public.employee_registrations;
create policy "employee_registrations_read_hrd_admin" on public.employee_registrations
for select using (is_hrd() or is_admin());

drop policy if exists "employee_registrations_write_hrd_admin" on public.employee_registrations;
create policy "employee_registrations_write_hrd_admin" on public.employee_registrations
for all using (is_hrd() or is_admin())
with check (is_hrd() or is_admin());

grant select, insert, update, delete on public.employee_registrations to authenticated;

-- ------------------------------------------------------------
-- Public submission RPC (SECURITY DEFINER, no read-back).
-- Rejects duplicates against existing employees and pending queue.
-- ------------------------------------------------------------
create or replace function public.submit_employee_registration(
  p_full_name        text,
  p_employee_no      text,
  p_email            text,
  p_phone            text default null,
  p_gender           text default 'L',
  p_marital_status   text default null,
  p_birth_place      text default null,
  p_birth_date       date default null,
  p_last_education   text default null,
  p_study_program    text default null,
  p_address_ktp      text default null,
  p_address_domicile text default null,
  p_home_unit_id     uuid default null,
  p_employee_status  text default 'CPTY',
  p_note             text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no    text := upper(regexp_replace(coalesce(p_employee_no, ''), '\s+', '', 'g'));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name  text := btrim(coalesce(p_full_name, ''));
begin
  if v_name = '' then raise exception 'Nama lengkap wajib diisi.'; end if;
  if v_no = '' then raise exception 'NIY wajib diisi.'; end if;
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email tidak valid.';
  end if;

  if exists (select 1 from profiles where employee_no = v_no or lower(email) = v_email) then
    raise exception 'NIY atau email sudah terdaftar sebagai pegawai.';
  end if;
  if exists (
    select 1 from employee_registrations
    where status = 'MENUNGGU' and (employee_no = v_no or lower(email) = v_email)
  ) then
    raise exception 'Pendaftaran dengan NIY atau email ini sudah menunggu validasi.';
  end if;

  insert into employee_registrations (
    full_name, employee_no, email, phone, gender, marital_status,
    birth_place, birth_date, last_education, study_program,
    address_ktp, address_domicile, home_unit_id, employee_status, note
  ) values (
    v_name, v_no, v_email, nullif(btrim(coalesce(p_phone, '')), ''),
    (case when upper(coalesce(p_gender,'L')) = 'P' then 'P' else 'L' end)::gender_enum,
    nullif(btrim(coalesce(p_marital_status,'')), ''),
    nullif(btrim(coalesce(p_birth_place,'')), ''), p_birth_date,
    nullif(btrim(coalesce(p_last_education,'')), ''),
    nullif(btrim(coalesce(p_study_program,'')), ''),
    nullif(btrim(coalesce(p_address_ktp,'')), ''),
    nullif(btrim(coalesce(p_address_domicile,'')), ''),
    p_home_unit_id,
    (case when p_employee_status in ('MAGANG','HONORER','CPTY','PTY') then p_employee_status else 'CPTY' end)::employee_status_enum,
    nullif(btrim(coalesce(p_note,'')), '')
  );
end;
$$;

-- Allow anonymous + authenticated submissions; revoke from public role.
revoke all on function public.submit_employee_registration(
  text, text, text, text, text, text, text, date, text, text, text, text, uuid, text, text
) from public;
grant execute on function public.submit_employee_registration(
  text, text, text, text, text, text, text, date, text, text, text, text, uuid, text, text
) to anon, authenticated;
