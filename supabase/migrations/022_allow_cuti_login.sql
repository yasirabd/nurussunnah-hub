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
  and p.active_status in ('AKTIF', 'CUTI')
  order by p.created_at asc
  limit 1;
$$;

revoke execute on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon;
