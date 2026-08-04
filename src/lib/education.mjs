// Sumber tunggal daftar pendidikan terakhir. Nilainya mengikuti Google Form
// "Konfirmasi Penawaran Kerja & Data PKWT" agar hasil intake langsung cocok
// dengan dropdown di aplikasi.

export const EDUCATION_LEVELS = [
  'SD/Sederajat',
  'SMP/Sederajat',
  'SMA/SMK/Sederajat',
  'D1/D2/D3',
  'D4/S1',
  'S2',
  'S3',
];

// Jenjang yang memerlukan isian program studi/jurusan.
export const EDUCATION_WITH_STUDY_PROGRAM = new Set([
  'D1/D2/D3',
  'D4/S1',
  'S2',
  'S3',
]);

// Nilai lama (sebelum penyeragaman) → nilai baru. Dipakai parser intake untuk
// data lawas; migrasi 039 memakai pemetaan yang sama untuk data di database.
const LEGACY_EDUCATION_MAP = {
  'SMA/SEDERAJAT': 'SMA/SMK/Sederajat',
  'SMK/SEDERAJAT': 'SMA/SMK/Sederajat',
  'D3': 'D1/D2/D3',
  'D2': 'D1/D2/D3',
  'D1': 'D1/D2/D3',
  'S1': 'D4/S1',
  'D4': 'D4/S1',
};

// Kembalikan nilai kanonik, atau '' bila tidak dikenali.
export function normalizeEducation(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  const match = EDUCATION_LEVELS.find(
    (level) => level.toUpperCase() === value.toUpperCase()
  );
  return match ?? LEGACY_EDUCATION_MAP[value.toUpperCase()] ?? '';
}
