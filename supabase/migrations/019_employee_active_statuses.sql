-- Separate employment category from lifecycle status.

create type public.employee_status_enum_v2 as enum ('MAGANG', 'HONORER', 'CPTY', 'PTY');
create type public.active_status_enum as enum ('AKTIF', 'CUTI', 'NONAKTIF', 'RESIGN', 'DIBERHENTIKAN', 'PENSIUN');

alter table public.profiles
  add column active_status public.active_status_enum;

update public.profiles
set active_status = case
  when employee_status::text = 'PENSIUN' then 'PENSIUN'::public.active_status_enum
  when is_active then 'AKTIF'::public.active_status_enum
  else 'NONAKTIF'::public.active_status_enum
end;

alter table public.profiles
  alter column active_status set default 'AKTIF'::public.active_status_enum,
  alter column active_status set not null;

alter table public.profiles
  add column employee_status_new public.employee_status_enum_v2 default 'CPTY'::public.employee_status_enum_v2 not null;

update public.profiles
set employee_status_new = case employee_status::text
  when 'TETAP' then 'PTY'::public.employee_status_enum_v2
  when 'HONORER' then 'HONORER'::public.employee_status_enum_v2
  when 'TIDAK_TETAP' then 'CPTY'::public.employee_status_enum_v2
  when 'KONTRAK' then 'CPTY'::public.employee_status_enum_v2
  when 'PENSIUN' then 'PTY'::public.employee_status_enum_v2
  else 'CPTY'::public.employee_status_enum_v2
end;

drop index if exists public.idx_profiles_is_active;
drop index if exists public.idx_profiles_scope_feedback;

alter table public.profiles drop column employee_status;
alter table public.profiles rename column employee_status_new to employee_status;
alter table public.profiles drop column is_active;

drop type public.employee_status_enum;
alter type public.employee_status_enum_v2 rename to employee_status_enum;

create index idx_profiles_active_status on public.profiles(active_status);
create index idx_profiles_scope_feedback on public.profiles(home_unit_id, active_status, employee_status);

drop function if exists public.get_feedback_targets(uuid);
drop function if exists public.get_feedback_monitoring(uuid);
drop function if exists public.get_feedback_monitoring_scoped(uuid);

create or replace function public.get_feedback_targets(p_academic_year_id uuid)
returns table(
  receiver_user_id uuid,
  full_name text,
  employee_no text,
  unit_name text,
  unit_code text,
  rating integer,
  feedback_text text,
  is_completed boolean,
  feedback_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    target.id as receiver_user_id,
    target.full_name,
    target.employee_no,
    u.name as unit_name,
    u.code as unit_code,
    pf.rating,
    pf.feedback_text,
    coalesce(pf.is_completed, false) as is_completed,
    pf.id as feedback_id
  from public.profiles target
  left join public.units u on u.id = target.home_unit_id
  left join public.peer_feedbacks pf
    on pf.receiver_user_id = target.id
    and pf.giver_user_id = auth.uid()
    and pf.academic_year_id = p_academic_year_id
  where target.id <> auth.uid()
    and target.active_status = 'AKTIF'
  order by target.full_name;
$$;

create or replace function public.get_feedback_monitoring(p_academic_year_id uuid)
returns table(
  user_id uuid,
  full_name text,
  employee_no text,
  unit_name text,
  unit_code text,
  target_count bigint,
  completed_count bigint,
  is_complete boolean
)
language sql
security definer
set search_path = public
as $$
  with active_profiles as (
    select p.id, p.full_name, p.employee_no, p.home_unit_id
    from public.profiles p
    where p.active_status = 'AKTIF'
  )
  select
    giver.id as user_id,
    giver.full_name,
    giver.employee_no,
    u.name as unit_name,
    u.code as unit_code,
    count(target.id) as target_count,
    count(pf.id) filter (where pf.is_completed) as completed_count,
    count(target.id) = count(pf.id) filter (where pf.is_completed) as is_complete
  from active_profiles giver
  left join active_profiles target on target.id <> giver.id
  left join public.units u on u.id = giver.home_unit_id
  left join public.peer_feedbacks pf
    on pf.giver_user_id = giver.id
    and pf.receiver_user_id = target.id
    and pf.academic_year_id = p_academic_year_id
  group by giver.id, giver.full_name, giver.employee_no, u.name, u.code
  order by giver.full_name;
$$;

create or replace function public.get_feedback_monitoring_scoped(p_academic_year_id uuid)
returns table(
  user_id uuid,
  full_name text,
  employee_no text,
  unit_name text,
  unit_code text,
  target_count bigint,
  completed_count bigint,
  is_complete boolean
)
language sql
security definer
set search_path = public
as $$
  with my_units as (
    select distinct unit_id
    from public.user_unit_assignments
    where user_id = auth.uid()
      and assignment_type = 'HOME'
      and unit_id is not null
    union
    select home_unit_id
    from public.profiles
    where id = auth.uid()
      and home_unit_id is not null
  ), active_profiles as (
    select p.id, p.full_name, p.employee_no, p.home_unit_id
    from public.profiles p
    where p.active_status = 'AKTIF'
      and p.home_unit_id in (select unit_id from my_units)
  )
  select
    giver.id as user_id,
    giver.full_name,
    giver.employee_no,
    u.name as unit_name,
    u.code as unit_code,
    count(target.id) as target_count,
    count(pf.id) filter (where pf.is_completed) as completed_count,
    count(target.id) = count(pf.id) filter (where pf.is_completed) as is_complete
  from active_profiles giver
  left join active_profiles target on target.id <> giver.id
  left join public.units u on u.id = giver.home_unit_id
  left join public.peer_feedbacks pf
    on pf.giver_user_id = giver.id
    and pf.receiver_user_id = target.id
    and pf.academic_year_id = p_academic_year_id
  group by giver.id, giver.full_name, giver.employee_no, u.name, u.code
  order by giver.full_name;
$$;

create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where (
    lower(p.email) = lower(trim(p_identifier))
    or p.employee_no = regexp_replace(upper(trim(p_identifier)), '\s+', '', 'g')
  )
  and p.active_status = 'AKTIF'
  order by p.created_at asc
  limit 1;
$$;
