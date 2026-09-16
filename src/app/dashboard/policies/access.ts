import 'server-only';
import { redirect } from 'next/navigation';
import { requireFeatureAccess } from '@/lib/auth/feature-access';
import { canAccessDashboard } from '@/lib/employee-leave.mjs';

export async function requirePolicyAccess(manage = false) {
  const { supabase, user } = await requireFeatureAccess();
  const [{ data: profile }, { data: roles, error }] = await Promise.all([
    supabase.from('profiles').select('active_status').eq('id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);
  if (!profile || !canAccessDashboard(profile.active_status)) redirect('/auth/logout');
  if (error) throw new Error('Tidak dapat memeriksa hak akses dokumen.');
  const canManage = roles.some(({ role }) => role === 'ADMIN' || role === 'HRD');
  if (manage && !canManage) redirect('/dashboard/policies');
  return { supabase, user, canManage };
}
