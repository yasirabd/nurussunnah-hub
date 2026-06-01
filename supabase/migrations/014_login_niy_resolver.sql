-- Allow the public login screen to resolve an employee NIY to the email
-- Supabase Auth requires, without exposing direct anon reads on profiles.
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email
  FROM public.profiles p
  WHERE p.employee_no = UPPER(REPLACE(TRIM(p_identifier), ' ', ''))
    AND p.is_active = true
    AND p.employee_status <> 'PENSIUN'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon;
