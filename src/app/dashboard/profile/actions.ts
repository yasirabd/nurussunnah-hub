'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

export async function updateMyProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { error } = await supabase.from('profiles').update({
    gender: text(formData, 'gender') === 'P' ? 'P' : 'L',
    marital_status: text(formData, 'marital_status') || null,
    birth_place: text(formData, 'birth_place') || null,
    birth_date: nullableDate(formData, 'birth_date'),
    last_education: text(formData, 'last_education') || null,
    phone: text(formData, 'phone') || null,
    address_ktp: text(formData, 'address_ktp') || null,
    address_domicile: text(formData, 'address_domicile') || null,
    facebook: text(formData, 'facebook') || null,
    twitter: text(formData, 'twitter') || null,
    instagram: text(formData, 'instagram') || null,
    avatar_url: text(formData, 'avatar_url') || null,
  }).eq('id', user.id);

  revalidatePath('/dashboard/profile');
  const key = error ? 'error' : 'success';
  const message = error ? error.message : 'Profil berhasil diperbarui.';
  redirect(`/dashboard/profile?${key}=${encodeURIComponent(message)}`);
}
