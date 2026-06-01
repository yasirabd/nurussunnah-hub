'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { EmployeeStatus, UserRoleEnum } from '@/types/database';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function redirectWith(ok: boolean, message: string): never {
  redirect(`/dashboard/employees?${ok ? 'success' : 'error'}=${encodeURIComponent(message)}`);
}

type EmployeeRole = 'PEGAWAI' | 'KEPALA_UNIT' | 'HRD' | 'ADMIN';

function hasAnyRole(roles: string[], allowed: EmployeeRole[]) {
  return allowed.some((role) => roles.includes(role));
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

export async function updateEmployeeProfileAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const id = text(formData, 'id');
  const employeeNo = text(formData, 'employee_no').replace(/\s/g, '');
  const homeUnitId = text(formData, 'home_unit_id') || null;

  const { error } = await supabase.from('profiles').update({
    full_name: text(formData, 'full_name'),
    employee_no: employeeNo,
    email: text(formData, 'email'),
    phone: text(formData, 'phone') || null,
    employee_status: text(formData, 'employee_status') as EmployeeStatus,
    is_active: formData.get('is_active') === 'on',
    home_unit_id: homeUnitId,
  }).eq('id', id);

  if (error) {
    revalidatePath('/dashboard/employees');
    redirectWith(false, error.message);
  }

  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (activeYear?.id) {
    const { error: deleteAssignmentError } = await supabase
      .from('user_unit_assignments')
      .delete()
      .eq('user_id', id)
      .eq('assignment_type', 'HOME')
      .eq('academic_year_id', activeYear.id);

    if (deleteAssignmentError) {
      revalidatePath('/dashboard/employees');
      redirectWith(false, deleteAssignmentError.message);
    }

    if (homeUnitId) {
      const { error: insertAssignmentError } = await supabase
        .from('user_unit_assignments')
        .insert({
          user_id: id,
          unit_id: homeUnitId,
          assignment_type: 'HOME',
          academic_year_id: activeYear.id,
        });

      if (insertAssignmentError) {
        revalidatePath('/dashboard/employees');
        redirectWith(false, insertAssignmentError.message);
      }
    }
  }

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Data pegawai berhasil diperbarui.');
}

export async function updateEmployeeRolesAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const userId = text(formData, 'user_id');
  const roleOptions: UserRoleEnum[] = ['PEGAWAI', 'KEPALA_UNIT', 'HRD', 'ADMIN'];
  const roles = roleOptions.filter((role) => formData.get(role) === 'on');

  const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (deleteError) redirectWith(false, deleteError.message);

  const rows = roles.map((role) => ({ user_id: userId, role }));
  const { error } = rows.length ? await supabase.from('user_roles').insert(rows) : { error: null };

  revalidatePath('/dashboard/employees');
  redirectWith(!error, error ? error.message : 'Role pegawai berhasil diperbarui.');
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


