'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const MARITAL_STATUS_OPTIONS = ['Sudah Kawin', 'Belum Kawin', 'Cerai'] as const;
const EDUCATION_OPTIONS = [
  'SD/Sederajat',
  'SMP/Sederajat',
  'SMA/SMK/Sederajat',
  'D1/D2/D3',
  'D4/S1',
  'S2',
  'S3',
] as const;
const EDUCATION_WITH_STUDY_PROGRAM = new Set<string>(['D1/D2/D3', 'D4/S1', 'S2', 'S3']);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function optionOrNull<T extends readonly string[]>(value: string, options: T) {
  return options.includes(value) ? value : null;
}

export async function updateMyProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const maritalStatus = optionOrNull(text(formData, 'marital_status'), MARITAL_STATUS_OPTIONS);
  const lastEducation = optionOrNull(text(formData, 'last_education'), EDUCATION_OPTIONS);
  const studyProgram = lastEducation && EDUCATION_WITH_STUDY_PROGRAM.has(lastEducation)
    ? text(formData, 'study_program') || null
    : null;

  const { error } = await supabase.from('profiles').update({
    gender: text(formData, 'gender') === 'P' ? 'P' : 'L',
    marital_status: maritalStatus,
    birth_place: text(formData, 'birth_place') || null,
    birth_date: nullableDate(formData, 'birth_date'),
    last_education: lastEducation,
    study_program: studyProgram,
    phone: text(formData, 'phone') || null,
    address_ktp: text(formData, 'address_ktp') || null,
    address_domicile: text(formData, 'address_domicile') || null,
    facebook: text(formData, 'facebook') || null,
    twitter: text(formData, 'twitter') || null,
    instagram: text(formData, 'instagram') || null,
  }).eq('id', user.id);

  revalidatePath('/dashboard/profile');
  const key = error ? 'error' : 'success';
  const message = error ? error.message : 'Profil berhasil diperbarui.';
  redirect(`/dashboard/profile?${key}=${encodeURIComponent(message)}`);
}
