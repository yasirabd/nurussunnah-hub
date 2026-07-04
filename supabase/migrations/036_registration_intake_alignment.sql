-- ============================================================
-- MIGRATION 036: Registrations aligned with intake form
--   - NIY dihilangkan dari pendaftaran (digenerate saat validasi).
--   - Tambah: NIK, sosial media, jabatan, kontak darurat, seragam,
--     URL KTP & pas foto (diupload ke Google Drive saat submit).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kolom baru pada employee_registrations
-- ------------------------------------------------------------
alter table public.employee_registrations
  add column if not exists nik                text,
  add column if not exists facebook           text,
  add column if not exists instagram          text,
  add column if not exists twitter            text,
  add column if not exists position_name      text,
  add column if not exists emergency_name     text,
  add column if not exists emergency_relation text,
  add column if not exists emergency_phone    text,
  add column if not exists uniform_size       text
    check (uniform_size is null or uniform_size in ('XS','S','M','L','XL','XXL','XXXL')),
  add column if not exists ktp_url            text,
  add column if not exists photo_url          text;

-- NIY (employee_no) tidak lagi diisi saat daftar -> boleh kosong.
alter table public.employee_registrations
  alter column employee_no drop not null;

-- ------------------------------------------------------------
-- 2. Rewrite submit_employee_registration (tanpa NIY, + field intake)
-- ------------------------------------------------------------
drop function if exists public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text, uuid, text, text
);

create or replace function public.submit_employee_registration(
  p_invite_code      text,
  p_full_name        text,
  p_email            text,
  p_nik              text default null,
  p_phone            text default null,
  p_gender           text default 'L',
  p_marital_status   text default null,
  p_birth_place      text default null,
  p_birth_date       date default null,
  p_last_education   text default null,
  p_study_program    text default null,
  p_address_ktp      text default null,
  p_address_domicile text default null,
  p_facebook         text default null,
  p_instagram        text default null,
  p_twitter          text default null,
  p_home_unit_id     uuid default null,
  p_employee_status  text default 'CPTY',
  p_position_name    text default null,
  p_emergency_name   text default null,
  p_emergency_relation text default null,
  p_emergency_phone  text default null,
  p_uniform_size     text default null,
  p_ktp_url          text default null,
  p_photo_url        text default null,
  p_drive_folder_id  text default null,
  p_note             text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_name    text := btrim(coalesce(p_full_name, ''));
  v_code    text := upper(btrim(coalesce(p_invite_code, '')));
  v_nik     text := nullif(regexp_replace(coalesce(p_nik, ''), '\D', '', 'g'), '');
  v_uniform text := upper(btrim(coalesce(p_uniform_size, '')));
  v_invite  employee_invites%rowtype;
  v_reg_id  uuid;
begin
  select * into v_invite from employee_invites where code = v_code for update;

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
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email tidak valid.';
  end if;
  if v_nik is not null and length(v_nik) <> 16 then
    raise exception 'NIK harus 16 digit angka.';
  end if;

  if exists (select 1 from profiles where lower(email) = v_email) then
    raise exception 'Email sudah terdaftar sebagai pegawai.';
  end if;
  if v_nik is not null and exists (select 1 from profiles where nik = v_nik) then
    raise exception 'NIK sudah terdaftar sebagai pegawai.';
  end if;
  if exists (
    select 1 from employee_registrations
    where status = 'MENUNGGU' and lower(email) = v_email
  ) then
    raise exception 'Pendaftaran dengan email ini sudah menunggu validasi.';
  end if;

  insert into employee_registrations (
    full_name, employee_no, email, nik, phone, gender, marital_status,
    birth_place, birth_date, last_education, study_program,
    address_ktp, address_domicile, facebook, instagram, twitter,
    home_unit_id, employee_status, position_name,
    emergency_name, emergency_relation, emergency_phone, uniform_size,
    ktp_url, photo_url, drive_folder_id, note
  ) values (
    v_name, null, v_email, v_nik, nullif(btrim(coalesce(p_phone, '')), ''),
    (case when upper(coalesce(p_gender,'L')) = 'P' then 'P' else 'L' end)::gender_enum,
    nullif(btrim(coalesce(p_marital_status,'')), ''),
    nullif(btrim(coalesce(p_birth_place,'')), ''), p_birth_date,
    nullif(btrim(coalesce(p_last_education,'')), ''),
    nullif(btrim(coalesce(p_study_program,'')), ''),
    nullif(btrim(coalesce(p_address_ktp,'')), ''),
    nullif(btrim(coalesce(p_address_domicile,'')), ''),
    nullif(btrim(coalesce(p_facebook,'')), ''),
    nullif(btrim(coalesce(p_instagram,'')), ''),
    nullif(btrim(coalesce(p_twitter,'')), ''),
    p_home_unit_id,
    (case when p_employee_status in ('MAGANG','HONORER','CPTY','PTY') then p_employee_status else 'CPTY' end)::employee_status_enum,
    nullif(btrim(coalesce(p_position_name,'')), ''),
    nullif(btrim(coalesce(p_emergency_name,'')), ''),
    nullif(btrim(coalesce(p_emergency_relation,'')), ''),
    nullif(btrim(coalesce(p_emergency_phone,'')), ''),
    (case when v_uniform in ('XS','S','M','L','XL','XXL','XXXL') then v_uniform else null end),
    nullif(btrim(coalesce(p_ktp_url,'')), ''),
    nullif(btrim(coalesce(p_photo_url,'')), ''),
    nullif(btrim(coalesce(p_drive_folder_id,'')), ''),
    nullif(btrim(coalesce(p_note,'')), '')
  )
  returning id into v_reg_id;

  update employee_invites
  set status = 'TERPAKAI', used_at = now(), used_registration_id = v_reg_id
  where id = v_invite.id;
end;
$$;

revoke all on function public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text,
  text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text,
  text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;
