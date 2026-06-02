'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { EmployeeStatus, UserRoleEnum } from '@/types/database';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
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
    employee_status: text(formData, 'employee_status') as EmployeeStatus,
    is_active: formData.get('is_active') === 'on',
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
  const id = text(formData, 'id');
  const payload = profilePayload(formData);

  const { error } = await supabase.from('profiles').update(payload).eq('id', id);

  if (error) {
    revalidatePath('/dashboard/employees');
    redirectWith(false, error.message);
  }

  try {
    await syncHomeAssignment(supabase, id, payload.home_unit_id);
  } catch (syncError) {
    revalidatePath('/dashboard/employees');
    redirectWith(false, syncError instanceof Error ? syncError.message : 'Gagal menyimpan unit pegawai.');
  }

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Data pegawai berhasil diperbarui.');
}

export async function createEmployeeAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const admin = createAdminClient();
  const payload = profilePayload(formData);

  if (!payload.full_name) redirectWith(false, 'Nama lengkap wajib diisi.');
  if (!payload.employee_no) redirectWith(false, 'NIY wajib diisi.');
  if (!payload.email) redirectWith(false, 'Email wajib diisi.');

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
    redirectWith(false, authError?.message ?? 'Gagal membuat akun login pegawai.');
  }

  const userId = authData.user.id;
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    ...payload,
    must_change_password: true,
  });
  if (profileError) redirectWith(false, profileError.message);

  try {
    await replaceRoles(supabase, userId, selectedRoles(formData));
    await syncHomeAssignment(supabase, userId, payload.home_unit_id);
  } catch (relationError) {
    redirectWith(false, relationError instanceof Error ? relationError.message : 'Gagal menyimpan relasi pegawai.');
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
    if (positionError) redirectWith(false, positionError.message);
  }

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Pegawai baru berhasil ditambahkan. Password awal: bismillahns.');
}

export async function updateEmployeeRolesAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const userId = text(formData, 'user_id');
  const roles = selectedRoles(formData);

  try {
    await replaceRoles(supabase, userId, roles);
  } catch (roleError) {
    redirectWith(false, roleError instanceof Error ? roleError.message : 'Gagal menyimpan role pegawai.');
  }

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Role pegawai berhasil diperbarui.');
}

export async function deactivateEmployeeAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const admin = createAdminClient();
  const id = text(formData, 'id');
  if (!id) redirectWith(false, 'ID pegawai tidak valid.');

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, employee_status: 'PENSIUN' })
    .eq('id', id);
  if (error) redirectWith(false, error.message);

  await admin.auth.admin.updateUserById(id, {
    app_metadata: { disabled_by_hrd: true },
  });

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Pegawai berhasil dinonaktifkan.');
}

export async function updateEmployeeCurrentPositionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const userId = text(formData, 'user_id');
  const positionName = text(formData, 'position_name');
  if (!positionName) redirectWith(false, 'Nama jabatan wajib diisi.');

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

    if (targetError) redirectWith(false, targetError.message);
    if (!targetProfile?.home_unit_id || !allowedUnitIds.includes(targetProfile.home_unit_id)) {
      redirectWith(false, 'Anda tidak berwenang mengubah jabatan pegawai di luar unit Anda.');
    }
  }

  const { data: existingPosition, error: existingError } = await supabase
    .from('position_histories')
    .select('id')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();

  if (existingError) redirectWith(false, existingError.message);
  if (!existingPosition?.id) redirectWith(false, 'Pegawai belum memiliki jabatan aktif.');

  const { error } = await supabase
    .from('position_histories')
    .update({ position_name: positionName })
    .eq('id', existingPosition.id)
    .eq('is_current', true);

  revalidatePath('/dashboard/employees');
  redirectWith(!error, error ? error.message : 'Jabatan pegawai berhasil diperbarui.');
}


