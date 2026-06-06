create table if not exists public.employee_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_leaves_valid_period check (end_date >= start_date)
);

create unique index if not exists idx_employee_leaves_one_active
on public.employee_leaves(user_id)
where status = 'ACTIVE';

create index if not exists idx_employee_leaves_user_status
on public.employee_leaves(user_id, status, start_date, end_date);

drop trigger if exists trg_employee_leaves_updated_at on public.employee_leaves;
create trigger trg_employee_leaves_updated_at
before update on public.employee_leaves
for each row execute function update_updated_at_column();

alter table public.employee_leaves enable row level security;

drop policy if exists "employee_leaves_select_self" on public.employee_leaves;
create policy "employee_leaves_select_self" on public.employee_leaves
for select using (user_id = auth.uid());

drop policy if exists "employee_leaves_select_hrd_admin" on public.employee_leaves;
create policy "employee_leaves_select_hrd_admin" on public.employee_leaves
for select using (is_hrd() or is_admin());

drop policy if exists "employee_leaves_select_kepala_unit" on public.employee_leaves;
create policy "employee_leaves_select_kepala_unit" on public.employee_leaves
for select using (
  is_kepala_unit()
  and exists (
    select 1
    from public.profiles target
    where target.id = employee_leaves.user_id
      and target.home_unit_id in (
        select unit_id
        from public.user_unit_assignments
        where user_id = auth.uid()
          and assignment_type = 'HOME'
          and unit_id is not null
      )
  )
);

drop policy if exists "employee_leaves_write_hrd_admin" on public.employee_leaves;
create policy "employee_leaves_write_hrd_admin" on public.employee_leaves
for all using (is_hrd() or is_admin())
with check (is_hrd() or is_admin());

grant select, insert, update, delete on public.employee_leaves to authenticated;
