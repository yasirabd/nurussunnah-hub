'use server';

import { redirect } from 'next/navigation';
import { requirePasswordChangeAccess } from '@/lib/auth/feature-access';

const DEFAULT_EMPLOYEE_PASSWORD = 'bismillahns';

export async function changeInitialPasswordAction(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirm_password') ?? '');

  if (password.length < 8) redirect('/dashboard/change-password?error=Password%20minimal%208%20karakter.');
  if (password === DEFAULT_EMPLOYEE_PASSWORD) redirect('/dashboard/change-password?error=Gunakan%20password%20baru%20yang%20berbeda.');
  if (password !== confirmPassword) redirect('/dashboard/change-password?error=Konfirmasi%20password%20tidak%20sama.');

  const { supabase, user } = await requirePasswordChangeAccess();

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) redirect(`/dashboard/change-password?error=${encodeURIComponent(passwordError.message)}`);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)
    .select('id')
    .single();
  if (profileError) redirect(`/dashboard/change-password?error=${encodeURIComponent(profileError.message)}`);

  redirect('/dashboard?success=Password%20berhasil%20diperbarui.');
}
