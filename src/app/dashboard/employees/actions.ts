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

async function ensureCanManageEmployees() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  const canManage = (roles ?? []).some((item) => item.role === 'HRD' || item.role === 'ADMIN');
  if (!canManage) redirect('/dashboard');

  return supabase;
}

export async function updateEmployeeProfileAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const id = text(formData, 'id');
  const employeeNo = text(formData, 'employee_no').replace(/\s/g, '');

  const { error } = await supabase.from('profiles').update({
    full_name: text(formData, 'full_name'),
    employee_no: employeeNo,
    email: text(formData, 'email'),
    phone: text(formData, 'phone') || null,
    employee_status: text(formData, 'employee_status') as EmployeeStatus,
    is_active: formData.get('is_active') === 'on',
    home_unit_id: text(formData, 'home_unit_id') || null,
  }).eq('id', id);

  revalidatePath('/dashboard/employees');
  redirectWith(!error, error ? error.message : 'Data pegawai berhasil diperbarui.');
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


