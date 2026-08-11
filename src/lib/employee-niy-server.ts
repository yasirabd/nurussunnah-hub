import type { SupabaseClient } from '@supabase/supabase-js';

import { academicYearForDate, validateManualMagangNiy } from '@/lib/niy.mjs';
import type { Database, EmployeeStatus } from '@/types/database';

export type EmployeeNoMode = "preserve" | "auto" | "manual";

type ResolveEmployeeNoInput = {
  supabase: SupabaseClient<Database>;
  mode: EmployeeNoMode;
  submittedEmployeeNo?: string | null;
  employeeStatus: EmployeeStatus;
  effectiveDate?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  currentEmployeeNo?: string | null;
  excludeUserId?: string | null;
};

function normalizeEmployeeNo(value?: string | null) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export async function resolveEmployeeNo({
  supabase,
  mode,
  submittedEmployeeNo,
  employeeStatus,
  effectiveDate,
  birthDate,
  gender,
  currentEmployeeNo,
  excludeUserId,
}: ResolveEmployeeNoInput): Promise<{ employeeNo: string } | { error: string }> {
  const employee_no_mode = mode;
  if (employeeStatus === 'MAGANG' && !effectiveDate) {
    return { error: 'Tanggal Mulai Magang wajib diisi.' };
  }

  if (employee_no_mode === 'preserve') {
    const employeeNo = normalizeEmployeeNo(currentEmployeeNo);
    if (!excludeUserId || !employeeNo) return { error: 'NIY tersimpan tidak ditemukan.' };
    return { employeeNo };
  }

  if (employee_no_mode === 'auto') {
    const { data, error } = await supabase.rpc("allocate_employee_no", {
      p_employee_status: employeeStatus,
      p_effective_date: effectiveDate ?? '',
      p_birth_date: birthDate ?? null,
      p_gender: gender ?? null,
    });
    if (error || !data) return { error: error?.message ?? 'Gagal membuat NIY otomatis.' };
    return { employeeNo: data };
  }

  let employeeNo = normalizeEmployeeNo(submittedEmployeeNo);
  if (!employeeNo) return { error: 'NIY wajib diisi.' };

  if (employeeStatus === 'MAGANG') {
    const { data: academicYears, error: academicYearError } = await supabase
      .from('academic_years')
      .select('id, start_date, end_date');
    if (academicYearError) return { error: academicYearError.message };

    const academicYear = academicYearForDate(effectiveDate ?? '', academicYears ?? []);
    if ('error' in academicYear) return academicYear;
    const validation = validateManualMagangNiy(employeeNo, academicYear.startYear);
    if ('error' in validation) return validation;
    employeeNo = validation.niy;
  }

  let duplicateQuery = supabase.from('profiles').select('id').eq('employee_no', employeeNo);
  if (excludeUserId) duplicateQuery = duplicateQuery.neq('id', excludeUserId);
  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
  if (duplicateError) return { error: duplicateError.message };
  if (duplicate) return { error: 'NIY sudah digunakan pegawai lain.' };

  return { employeeNo };
}
