-- Generate employee numbers safely across concurrent HRD/Admin operations.

alter table public.profiles
  add column employee_status_effective_date date;

create table public.employee_no_counters (
  series_key text primary key,
  last_value integer not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

alter table public.employee_no_counters enable row level security;
revoke all on table public.employee_no_counters from public, anon, authenticated;

create or replace function public.allocate_employee_no(
  p_employee_status text,
  p_effective_date date,
  p_birth_date date default null,
  p_gender text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status employee_status_enum;
  v_year_count integer;
  v_academic_year_id uuid;
  v_start_year integer;
  v_series_key text;
  v_counter integer;
  v_existing_max integer;
  v_next integer;
  v_gender_part text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('HRD', 'ADMIN')
  ) then
    raise exception 'Hanya HRD/Admin yang dapat membuat NIY.';
  end if;

  if p_employee_status not in ('MAGANG', 'HONORER', 'OUTSOURCE', 'CPTY', 'PTY') then
    raise exception 'Status pegawai tidak valid.';
  end if;
  if p_effective_date is null then
    raise exception 'Tanggal efektif status pegawai wajib diisi.';
  end if;

  v_status := p_employee_status::employee_status_enum;

  if v_status = 'MAGANG' then
    select count(*)
    into v_year_count
    from public.academic_years
    where p_effective_date between start_date and end_date;

    if v_year_count = 0 then
      raise exception 'Tanggal tidak termasuk Tahun Pelajaran mana pun.';
    end if;
    if v_year_count > 1 then
      raise exception 'Tanggal termasuk lebih dari satu Tahun Pelajaran.';
    end if;

    select id, extract(year from start_date)::integer
    into v_academic_year_id, v_start_year
    from public.academic_years
    where p_effective_date between start_date and end_date;

    v_series_key := 'MAG:' || v_academic_year_id::text;
    insert into public.employee_no_counters(series_key, last_value)
    values (v_series_key, 0)
    on conflict (series_key) do nothing;

    select last_value into v_counter
    from public.employee_no_counters
    where series_key = v_series_key
    for update;

    select coalesce(max(substring(employee_no from 10 for 3)::integer), 0)
    into v_existing_max
    from public.profiles
    where employee_no ~ ('^MAG-' || v_start_year::text || '-[0-9]{3}$');

    v_next := greatest(v_counter, v_existing_max) + 1;
    if v_next > 999 then
      raise exception 'Nomor urut Magang untuk Tahun Pelajaran ini sudah mencapai 999.';
    end if;

    update public.employee_no_counters
    set last_value = v_next, updated_at = now()
    where series_key = v_series_key;

    return 'MAG-' || v_start_year::text || '-' || lpad(v_next::text, 3, '0');
  end if;

  if p_birth_date is null then
    raise exception 'Tanggal lahir wajib diisi untuk membuat NIY reguler.';
  end if;
  if p_gender not in ('L', 'P') then
    raise exception 'Jenis kelamin wajib dipilih untuk membuat NIY reguler.';
  end if;

  v_series_key := 'REGULAR';
  insert into public.employee_no_counters(series_key, last_value)
  values (v_series_key, 0)
  on conflict (series_key) do nothing;

  select last_value into v_counter
  from public.employee_no_counters
  where series_key = v_series_key
  for update;

  select coalesce(max(substring(employee_no from 15)::integer), 0)
  into v_existing_max
  from public.profiles
  where employee_no ~ '^[0-9]{15,}$';

  v_next := greatest(v_counter, v_existing_max) + 1;
  update public.employee_no_counters
  set last_value = v_next, updated_at = now()
  where series_key = v_series_key;

  v_gender_part := case when p_gender = 'P' then '12' else '11' end;
  return to_char(p_birth_date, 'YYYYMM')
    || to_char(p_effective_date, 'YYYYMM')
    || v_gender_part
    || v_next::text;
end;
$$;

revoke all on function public.allocate_employee_no(text, date, date, text) from public;
grant execute on function public.allocate_employee_no(text, date, date, text) to authenticated;
