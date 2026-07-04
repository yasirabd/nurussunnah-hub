-- ============================================================
-- MIGRATION 035: Employee registration invite codes
-- Single-use invite codes for the hidden /register page.
-- Replaces the static REGISTER_ACCESS_KEY approach.
--   - HRD/Admin generate a unique code (valid 7 days).
--   - Code consumed on successful registration submission.
--   - Used or expired codes are rejected.
-- ============================================================

create type public.employee_invite_status_enum
  as enum ('AKTIF', 'TERPAKAI', 'KEDALUWARSA');

create table public.employee_invites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  status      public.employee_invite_status_enum not null default 'AKTIF',
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_by  uuid references public.profiles(id) on delete set null,
  used_at     timestamptz,
  used_registration_id uuid references public.employee_registrations(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_employee_invites_code on public.employee_invites(code);
create index idx_employee_invites_status on public.employee_invites(status);

alter table public.employee_invites enable row level security;

-- Only HRD/Admin can see/manage invites. Public never reads this table;
-- validation happens inside SECURITY DEFINER RPCs.
drop policy if exists "employee_invites_read_hrd_admin" on public.employee_invites;
create policy "employee_invites_read_hrd_admin" on public.employee_invites
for select using (is_hrd() or is_admin());

drop policy if exists "employee_invites_write_hrd_admin" on public.employee_invites;
create policy "employee_invites_write_hrd_admin" on public.employee_invites
for all using (is_hrd() or is_admin())
with check (is_hrd() or is_admin());

grant select, insert, update, delete on public.employee_invites to authenticated;

-- ------------------------------------------------------------
-- Generate an invite code (HRD/Admin only). Returns the code.
-- ------------------------------------------------------------
create or replace function public.generate_employee_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt int := 0;
begin
  if not (is_hrd() or is_admin()) then
    raise exception 'Tidak diizinkan.';
  end if;

  loop
    v_attempt := v_attempt + 1;
    -- 8 char base32-ish code, unambiguous (no 0/O/1/I), grouped XXXX-XXXX.
    v_code := (
      select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 8)
    );
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    exit when not exists (select 1 from employee_invites where code = v_code);
    if v_attempt > 20 then
      raise exception 'Gagal membuat kode unik, coba lagi.';
    end if;
  end loop;

  insert into employee_invites (code, created_by)
  values (v_code, auth.uid());

  return v_code;
end;
$$;

revoke all on function public.generate_employee_invite() from public;
grant execute on function public.generate_employee_invite() to authenticated;

-- ------------------------------------------------------------
-- Validate an invite code for the public register page (read-only).
-- Returns true only if the code is usable right now.
-- ------------------------------------------------------------
create or replace function public.check_employee_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select (status = 'AKTIF' and expires_at > now())
  into v_ok
  from employee_invites
  where code = upper(btrim(coalesce(p_code, '')));
  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.check_employee_invite(text) from public;
grant execute on function public.check_employee_invite(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Rewrite submit_employee_registration to require + consume an invite.
-- ------------------------------------------------------------
create or replace function public.submit_employee_registration(
  p_invite_code      text,
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
  v_no      text := upper(regexp_replace(coalesce(p_employee_no, ''), '\s+', '', 'g'));
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_name    text := btrim(coalesce(p_full_name, ''));
  v_code    text := upper(btrim(coalesce(p_invite_code, '')));
  v_invite  employee_invites%rowtype;
  v_reg_id  uuid;
begin
  -- Lock the invite row to prevent double-use races.
  select * into v_invite
  from employee_invites
  where code = v_code
  for update;

  if v_invite.id is null then
    raise exception 'Kode undangan tidak valid.';
  end if;
  if v_invite.status = 'TERPAKAI' then
    raise exception 'Kode undangan sudah pernah digunakan.';
  end if;
  if v_invite.status = 'KEDALUWARSA' or v_invite.expires_at <= now() then
    update employee_invites set status = 'KEDALUWARSA' where id = v_invite.id;
    raise exception 'Kode undangan sudah kedaluwarsa.';
  end if;

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
  )
  returning id into v_reg_id;

  -- Consume the invite (single-use).
  update employee_invites
  set status = 'TERPAKAI', used_at = now(), used_registration_id = v_reg_id
  where id = v_invite.id;
end;
$$;

revoke all on function public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text, uuid, text, text
) from public;
grant execute on function public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text, uuid, text, text
) to anon, authenticated;

-- Drop the old 15-arg signature (without invite code) from migration 034.
drop function if exists public.submit_employee_registration(
  text, text, text, text, text, text, text, date, text, text, text, text, uuid, text, text
);
