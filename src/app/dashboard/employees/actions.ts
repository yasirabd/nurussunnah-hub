'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeLeavePayload, normalizeStatusDetailPayload } from '@/lib/employee-leave.mjs';
import { isActiveStatus, isEmployeeStatus } from '@/lib/employee-status';
import type { ActiveStatus, EmployeeStatus, UserRoleEnum } from '@/types/database';
function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}
function safeReturnTo(formData: FormData) {
  const value = text(formData, 'return_to');
  return value.startsWith('/dashboard/employees') ? value : '/dashboard/employees';
}
function redirectToPath(path: string, ok: boolean, message: string): never {
  const separator = path.includes('?') ? '&' : '?';
  redirect(`${path}${separator}${ok ? 'success' : 'error'}=${encodeURIComponent(message)}`);
}
function redirectWith(ok: boolean, message: string): never {
  redirect(`/dashboard/employees?${ok ? 'success' : 'error'}=${encodeURIComponent(message)}`);
}
type EmployeeRole = 'PEGAWAI' | 'KEPALA_UNIT' | 'HRD' | 'ADMIN';
const DEFAULT_EMPLOYEE_PASSWORD = 'bismillahns';
const roleOptions: UserRoleEnum[] = ['PEGAWAI', 'KEPALA_UNIT', 'HRD', 'ADMIN'];
function hasAnyRole(roles: string[], allowed: EmployeeRole[]) {
  return allowed.some((role) => roles.includes(role));
}
function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}
function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}
function employeeStatus(formData: FormData): EmployeeStatus {
  const value = text(formData, 'employee_status');
  return isEmployeeStatus(value) ? value : 'CPTY';
}
function activeStatus(formData: FormData): ActiveStatus {
  const value = text(formData, 'active_status');
  return isActiveStatus(value) ? value : 'AKTIF';
}
function normalizeEmployeeNo(formData: FormData) {
  return text(formData, 'employee_no').replace(/\s/g, '').toUpperCase();
}
function selectedRoles(formData: FormData): UserRoleEnum[] {
  const roles = roleOptions.filter((role) => formData.get(role) === 'on');
  return roles.length ? roles : ['PEGAWAI'];
}
function profilePayload(formData: FormData) {
  return {
    full_name: text(formData, 'full_name'),
    employee_no: normalizeEmployeeNo(formData),
    email: text(formData, 'email').toLowerCase(),
    phone: nullableText(formData, 'phone'),
    gender: text(formData, 'gender') === 'P' ? ('P' as const) : ('L' as const),
    marital_status: nullableText(formData, 'marital_status'),
    birth_place: nullableText(formData, 'birth_place'),
    birth_date: nullableDate(formData, 'birth_date'),
    last_education: nullableText(formData, 'last_education'),
    study_program: nullableText(formData, 'study_program'),
    address_ktp: nullableText(formData, 'address_ktp'),
    address_domicile: nullableText(formData, 'address_domicile'),
    facebook: nullableText(formData, 'facebook'),
    instagram: nullableText(formData, 'instagram'),
    twitter: nullableText(formData, 'twitter'),
    employee_status: employeeStatus(formData),
    active_status: activeStatus(formData),
    home_unit_id: nullableText(formData, 'home_unit_id'),
  };
}
async function getAllowedKepalaUnitIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [{ data: assignments }, { data: profile }] = await Promise.all([
    supabase
      .from('user_unit_assignments')
      .select('unit_id')
      .eq('user_id', userId)
      .eq('assignment_type', 'HOME'),
    supabase.from('profiles').select('home_unit_id').eq('id', userId).maybeSingle(),
  ]);
  return Array.from(
    new Set(
      [
        ...(assignments ?? []).map((item) => item.unit_id).filter(Boolean),
        profile?.home_unit_id,
      ].filter((unitId): unitId is string => Boolean(unitId))
    )
  );
}
async function ensureCanManageEmployees() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  const roleNames = (roles ?? []).map((item) => item.role);
  const canManage = hasAnyRole(roleNames, ['HRD', 'ADMIN']);
  if (!canManage) redirect('/dashboard');
  return supabase;
}
async function syncHomeAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  homeUnitId: string | null
) {
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();
  if (!activeYear?.id) return;
  const { error: deleteError } = await supabase
    .from('user_unit_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('assignment_type', 'HOME')
    .eq('academic_year_id', activeYear.id);
  if (deleteError) throw deleteError;
  if (!homeUnitId) return;
  const { error: insertError } = await supabase.from('user_unit_assignments').insert({
    user_id: userId,
    unit_id: homeUnitId,
    assignment_type: 'HOME',
    academic_year_id: activeYear.id,
  });
  if (insertError) throw insertError;
}
async function syncActiveLeave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  actorId: string,
  leave: ReturnType<typeof normalizeLeavePayload>['data']
) {
  if (!leave) {
    const { error } = await supabase
      .from('employee_leaves')
      .update({ status: 'COMPLETED' })
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');
    if (error) throw error;
    return;
  }
  const { data: existingLeave, error: existingError } = await supabase
    .from('employee_leaves')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingLeave?.id) {
    const { error } = await supabase
      .from('employee_leaves')
      .update({
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason,
      })
      .eq('id', existingLeave.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('employee_leaves').insert({
    user_id: userId,
    start_date: leave.start_date,
    end_date: leave.end_date,
    reason: leave.reason,
    status: 'ACTIVE',
    created_by: actorId,
  });
  if (error) throw error;
}
async function replaceRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  roles: UserRoleEnum[]
) {
  const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase
    .from('user_roles')
    .insert(roles.map((role) => ({ user_id: userId, role })));
  if (insertError) throw insertError;
}
export async function updateEmployeeProfileAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const returnTo = safeReturnTo(formData);
  const id = text(formData, 'id');
  const payload = profilePayload(formData);
  const leavePayload = normalizeLeavePayload(formData);
  const statusDetailPayload = normalizeStatusDetailPayload(formData);
  if (leavePayload.error) redirectToPath(returnTo, false, leavePayload.error);
  if (statusDetailPayload.error) redirectToPath(returnTo, false, statusDetailPayload.error);
  const { error } = await supabase
    .from('profiles')
    .update({ ...payload, ...statusDetailPayload.data })
    .eq('id', id);
  if (error) {
    revalidatePath('/dashboard/employees');
    redirectToPath(returnTo, false, error.message);
  }
  try {
    await syncHomeAssignment(supabase, id, payload.home_unit_id);
    await syncActiveLeave(supabase, id, user.id, leavePayload.data);
  } catch (syncError) {
    revalidatePath('/dashboard/employees');
    redirectToPath(returnTo, false, syncError instanceof Error ? syncError.message : 'Gagal menyimpan unit pegawai.');
  }
  revalidatePath('/dashboard/employees');
  redirectToPath(returnTo, true, 'Data pegawai berhasil diperbarui.');
}
export async function createEmployeeAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const admin = createAdminClient();
  const returnTo = safeReturnTo(formData);
  const payload = profilePayload(formData);
  const leavePayload = normalizeLeavePayload(formData);
  const statusDetailPayload = normalizeStatusDetailPayload(formData);
  if (!payload.full_name) redirectToPath(returnTo, false, 'Nama lengkap wajib diisi.');
  if (!payload.employee_no) redirectToPath(returnTo, false, 'NIY wajib diisi.');
  if (!payload.email) redirectToPath(returnTo, false, 'Email wajib diisi.');
  if (leavePayload.error) redirectToPath(returnTo, false, leavePayload.error);
  if (statusDetailPayload.error) redirectToPath(returnTo, false, statusDetailPayload.error);
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: payload.full_name,
      employee_no: payload.employee_no,
      gender: payload.gender,
    },
  });
  if (authError || !authData.user?.id) {
    redirectToPath(returnTo, false, authError?.message ?? 'Gagal membuat akun login pegawai.');
  }
  const userId = authData.user.id;
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    ...payload,
    ...statusDetailPayload.data,
    must_change_password: true,
  });
  if (profileError) redirectToPath(returnTo, false, profileError.message);
  try {
    await replaceRoles(supabase, userId, selectedRoles(formData));
    await syncHomeAssignment(supabase, userId, payload.home_unit_id);
    await syncActiveLeave(supabase, userId, user.id, leavePayload.data);
  } catch (relationError) {
    redirectToPath(returnTo, false, relationError instanceof Error ? relationError.message : 'Gagal menyimpan relasi pegawai.');
  }
  const positionName = text(formData, 'position_name');
  if (positionName) {
    const { error: positionError } = await supabase.from('position_histories').insert({
      user_id: userId,
      unit_id: payload.home_unit_id,
      position_name: positionName,
      start_date: new Date().toISOString().slice(0, 10),
      is_current: true,
    });
    if (positionError) redirectToPath(returnTo, false, positionError.message);
  }
  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Pegawai baru berhasil ditambahkan. Password awal: bismillahns.');
}
export async function updateEmployeeRolesAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const returnTo = safeReturnTo(formData);
  const userId = text(formData, 'user_id');
  const roles = selectedRoles(formData);
  try {
    await replaceRoles(supabase, userId, roles);
  } catch (roleError) {
    redirectToPath(returnTo, false, roleError instanceof Error ? roleError.message : 'Gagal menyimpan role pegawai.');
  }
  revalidatePath('/dashboard/employees');
  redirectToPath(returnTo, true, 'Role pegawai berhasil diperbarui.');
}
export async function deactivateEmployeeAction(formData: FormData) {
  try {
    const supabase = await ensureCanManageEmployees();
    const admin = createAdminClient();
    const id = text(formData, 'id');
    if (!id) redirectWith(false, 'ID pegawai tidak valid.');
    const { error } = await supabase
      .from('profiles')
      .update({ active_status: 'NONAKTIF' })
      .eq('id', id);
    if (error) redirectWith(false, error.message);
    await admin.auth.admin.updateUserById(id, {
      app_metadata: { disabled_by_hrd: true },
    });
    revalidatePath('/dashboard/employees');
    redirectWith(true, 'Pegawai berhasil dinonaktifkan.');
  } catch (err) {
    console.error('deactivateEmployeeAction failed:', err);
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal.';
    redirect(`/dashboard/employees?error=${encodeURIComponent(message)}`);
  }
}
export async function updateEmployeeCurrentPositionAction(formData: FormData) {
  const supabase = await createClient();
  const returnTo = safeReturnTo(formData);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const userId = text(formData, 'user_id');
  const positionName = text(formData, 'position_name');
  if (!positionName) redirectToPath(returnTo, false, 'Nama jabatan wajib diisi.');
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const roles = (roleRows ?? []).map((item) => item.role);
  const isManager = hasAnyRole(roles, ['HRD', 'ADMIN']);
  const isKepalaUnit = roles.includes('KEPALA_UNIT');
  if (!isManager && !isKepalaUnit) redirect('/dashboard');
  if (!isManager) {
    const allowedUnitIds = await getAllowedKepalaUnitIds(supabase, user.id);
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('home_unit_id')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) redirectToPath(returnTo, false, targetError.message);
    if (!targetProfile?.home_unit_id || !allowedUnitIds.includes(targetProfile.home_unit_id)) {
      redirectToPath(returnTo, false, 'Anda tidak berwenang mengubah jabatan pegawai di luar unit Anda.');
    }
  }
  const { data: existingPosition, error: existingError } = await supabase
    .from('position_histories')
    .select('id')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();
  if (existingError) redirectToPath(returnTo, false, existingError.message);
  if (!existingPosition?.id) redirectToPath(returnTo, false, 'Pegawai belum memiliki jabatan aktif.');
  const { error } = await supabase
    .from('position_histories')
    .update({ position_name: positionName })
    .eq('id', existingPosition.id)
    .eq('is_current', true);
  revalidatePath('/dashboard/employees');
  redirectToPath(returnTo, !error, error ? error.message : 'Jabatan pegawai berhasil diperbarui.');
}
// ——— Bulk Import Types ———
export type BulkImportRow = {
  rowNumber: number
  full_name: string
  employee_no: string
  active_status: string
  gender: string
  marital_status: string | null
  birth_place: string | null
  birth_date: string | null
  last_education: string | null
  address_ktp: string | null
  address_domicile: string | null
  phone: string | null
  email: string
  facebook: string | null
  twitter: string | null
  instagram: string | null
  employee_status: string
  unit_name: string
}
export type ImportPreviewRow = BulkImportRow & {
  validation: 'valid' | 'skip'
  skip_reason?: string
}
export type ImportResult = {
  total: number
  success: number
  skipped: number
  errors: { row: number; reason: string }[]
}
// ——— Bulk Import Helpers ———
const GENDER_MAP: Record<string, 'L' | 'P'> = {
  'LAKI-LAKI': 'L',
  'PEREMPUAN': 'P',
}
const ACTIVE_STATUS_MAP: Record<string, 'AKTIF' | 'NONAKTIF'> = {
  'AKTIF': 'AKTIF',
  'NONAKTIF': 'NONAKTIF',
}
const EMPLOYEE_STATUS_MAP: Record<string, EmployeeStatus> = {
  'PTY': 'PTY',
  'HONORER': 'HONORER',
  'MAGANG': 'MAGANG',
  'CPTY': 'CPTY',
  'CALON PTY': 'CPTY',
}
function normalizeGender(raw: string): 'L' | 'P' {
  return GENDER_MAP[raw.trim().toUpperCase()] ?? 'L'
}
function normalizeActiveStatus(raw: string): 'AKTIF' | 'NONAKTIF' {
  const key = raw.trim().toUpperCase().replace(/[- ]/g, '')
  return ACTIVE_STATUS_MAP[key] ?? 'AKTIF'
}
function normalizeEmployeeStatus(raw: string): EmployeeStatus {
  const key = raw.trim().toUpperCase()
  return EMPLOYEE_STATUS_MAP[key] || 'CPTY'
}
function serialDateToISO(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000).toISOString().slice(0, 10);
}
function parseDate(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null
  const months: Record<string, string> = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12',
    'januari': '01', 'februari': '02', 'maret': '03',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'oktober': '10', 'desember': '12',
  }
  const trimmed = raw.trim()
  // Excel serial date number
  const num = Number(trimmed)
  if (!isNaN(num) && num > 20000 && num < 60000) {
    return serialDateToISO(num)
  }
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (match) {
    const month = months[match[2].toLowerCase()]
    if (month) return `${match[3]}-${month}-${String(parseInt(match[1])).padStart(2, '0')}`
  }
  return null
}
function guessEmail(row: BulkImportRow): string {
  if (row.email && row.email.includes('@')) return row.email.toLowerCase().replace(/\s/g, '')
  return `${row.employee_no}@nurussunnah.sch.id`
}
// ——— Bulk Import Action ———
export async function importBulkEmployeesAction(
  rows: BulkImportRow[]
): Promise<ImportResult> {
  const supabase = await ensureCanManageEmployees()
  const [unitResult, yearResult] = await Promise.all([
    supabase.from('units').select('id, name'),
    supabase.from('academic_years').select('id').eq('is_active', true).maybeSingle(),
  ])
  const unitMap = new Map<string, string>()
  for (const u of unitResult.data ?? []) {
    unitMap.set(u.name.trim().toLowerCase(), u.id)
  }
  const activeYearId = yearResult.data?.id ?? null
  const admin = createAdminClient()
  const result: ImportResult = { total: rows.length, success: 0, skipped: 0, errors: [] }
  for (const row of rows) {
    // Auto-generate NIY for empty NIY (honorer without NIY)
    let employeeNo = row.employee_no
    if (!employeeNo || !employeeNo.trim()) {
      employeeNo = `H-${row.rowNumber}`
    }
    employeeNo = employeeNo.trim().toUpperCase().replace(/\s/g, '')
    const unitId = unitMap.get(row.unit_name.trim().toLowerCase())
    if (!unitId) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: `Unit "${row.unit_name}" tidak ditemukan di sistem` })
      continue
    }
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .or(`employee_no.eq.${row.employee_no.trim()},email.eq.${guessEmail(row)}`)
      .maybeSingle()
    if (existing) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: 'NIY atau email sudah terdaftar' })
      continue
    }
    const email = guessEmail(row)

    // Check if auth user already exists (e.g. from a previous import attempt)
    let userId: string | null = null
    // Try to find existing auth user by email via Admin API
    const encodedEmail = encodeURIComponent(email)
    const userUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const userResp = await fetch(userUrl + '/auth/v1/admin/users?filter=email:' + encodedEmail, {
      headers: {
        apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
    const userJson = await userResp.json()
    const matchedUser = userJson.users?.[0]

    if (matchedUser?.id) {
      userId = matchedUser.id
    } else {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_EMPLOYEE_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name.trim(),
          employee_no: employeeNo,
        },
      })
      if (authError || !authData.user?.id) {
        result.skipped++
        result.errors.push({ row: row.rowNumber, reason: 'Gagal buat akun: ' + (authError?.message ?? 'unknown') })
        continue
      }
      userId = authData.user.id
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId!,
      full_name: row.full_name.trim(),
      employee_no: employeeNo,
      email,
      phone: row.phone || null,
      gender: normalizeGender(row.gender),
      marital_status: row.marital_status || null,
      birth_place: row.birth_place || null,
      birth_date: parseDate(row.birth_date),
      last_education: row.last_education || null,
      address_ktp: row.address_ktp || null,
      address_domicile: row.address_domicile || row.address_ktp || null,
      facebook: row.facebook || null,
      twitter: row.twitter || null,
      instagram: row.instagram || null,
      employee_status: normalizeEmployeeStatus(row.employee_status),
      active_status: normalizeActiveStatus(row.active_status),
      home_unit_id: unitId,
      must_change_password: true,
      }, { onConflict: 'id' })
    if (profileError) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: `Gagal insert profile: ${profileError.message}` })
      continue
    }
    await supabase.from('user_roles').insert({
      user_id: userId!,
      role: 'PEGAWAI',
    })
    if (activeYearId) {
      await supabase.from('user_unit_assignments').upsert({
      user_id: userId!,
        unit_id: unitId,
        assignment_type: 'HOME',
        academic_year_id: activeYearId,
      }, { onConflict: 'user_id,unit_id,assignment_type,academic_year_id' })
    }
    result.success++
  }
  revalidatePath('/dashboard/employees')
  return result
}

export async function resetPasswordAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows ?? []).map((item) => item.role);
    if (!roles.includes('ADMIN')) redirect('/dashboard');
    const userId = text(formData, 'id');
    if (!userId) redirectWith(false, 'ID pegawai tidak valid.');
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      password: DEFAULT_EMPLOYEE_PASSWORD,
    });
    if (authError) redirectWith(false, 'Gagal reset password: ' + authError.message);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);
    if (profileError) redirectWith(false, profileError.message);
    revalidatePath('/dashboard/employees');
    redirectWith(true, 'Password berhasil di-reset ke default.');
  } catch (err) {
    console.error('resetPasswordAction failed:', err);
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal.';
    redirect(`/dashboard/employees?error=${encodeURIComponent(message)}`);
  }
}
