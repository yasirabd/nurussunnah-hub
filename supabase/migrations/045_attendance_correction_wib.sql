-- Evaluate the existing CURRENT_DATE guard in WIB, regardless of session timezone.
ALTER FUNCTION public.submit_attendance_correction(
  date, public.attendance_correction_kind_enum,
  public.attendance_time_scope_enum, text, time, time
) SET timezone = 'Asia/Jakarta';
