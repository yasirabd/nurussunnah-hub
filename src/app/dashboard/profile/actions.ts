'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EDUCATION_LEVELS, EDUCATION_WITH_STUDY_PROGRAM } from '@/lib/education.mjs';

const MARITAL_STATUS_OPTIONS = ['Belum Kawin', 'Kawin', 'Cerai Mati', 'Cerai Hidup'] as const;
const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

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
  const lastEducation = optionOrNull(text(formData, 'last_education'), EDUCATION_LEVELS);
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

  const uniformSize = optionOrNull(text(formData, 'uniform_size'), UNIFORM_SIZES);
  const emergencyName = text(formData, 'emergency_name') || null;
  const emergencyRelation = text(formData, 'emergency_relation') || null;
  const emergencyPhone = text(formData, 'emergency_phone') || null;
  if (!error && (uniformSize || emergencyName || emergencyRelation || emergencyPhone)) {
    await supabase.from('employee_intake').upsert(
      {
        user_id: user.id,
        emergency_name: emergencyName,
        emergency_relation: emergencyRelation,
        emergency_phone: emergencyPhone,
        uniform_size: uniformSize as ('XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | null),
      },
      { onConflict: 'user_id' }
    );
  }

  revalidatePath('/dashboard/profile');
  const key = error ? 'error' : 'success';
  const message = error ? error.message : 'Profil berhasil diperbarui.';
  redirect(`/dashboard/profile?${key}=${encodeURIComponent(message)}`);
}
