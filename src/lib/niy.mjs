// Generator NIY (Nomor Induk Yayasan) Nurus Sunnah.
//
// Format: [YYMM lahir][YYYYMM masuk][gender][urut]
//   - YYYYMM lahir: 4 digit tahun + 2 digit bulan lahir (contoh 200110 = Okt 2001)
//   - YYYYMM masuk: 4 digit tahun + 2 digit bulan masuk (contoh 202509 = Sep 2025)
//   - gender     : 11 = laki-laki (L), 12 = perempuan (P)
//   - urut       : nomor urut pegawai (tanpa padding), contoh 482
//
// Contoh lengkap: 200110 + 202509 + 12 + 482 -> "20011020250912482" tanpa spasi.
//
// Blok fixed sepanjang 14 digit (6 + 6 + 2); sisanya adalah nomor urut.

export const NIY_FIXED_PREFIX_LENGTH = 14;

// Ambil YYYYMM dari tanggal lahir ISO (YYYY-MM-DD).
export function birthPart(birthDateISO) {
  const m = (birthDateISO || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return m[1] + m[2]; // YYYY + MM
}

// Ambil YYYYMM dari tanggal/bulan masuk ISO (YYYY-MM atau YYYY-MM-DD).
export function joinPart(joinDateISO) {
  const m = (joinDateISO || '').match(/^(\d{4})-(\d{2})/);
  if (!m) return '';
  return m[1] + m[2]; // YYYY + MM
}

export function genderPart(gender) {
  if (gender === 'P') return '12';
  if (gender === 'L') return '11';
  return '';
}

// Ekstrak nomor urut dari sebuah NIY (digit setelah 14 karakter fixed).
export function sequenceOf(niy) {
  const digits = String(niy || '').replace(/\D/g, '');
  if (digits.length <= NIY_FIXED_PREFIX_LENGTH) return null;
  const suffix = digits.slice(NIY_FIXED_PREFIX_LENGTH);
  const n = Number(suffix);
  return Number.isFinite(n) ? n : null;
}

// Hitung nomor urut berikutnya dari daftar employee_no existing.
export function nextSequence(existingNiys) {
  let max = 0;
  for (const niy of existingNiys || []) {
    const seq = sequenceOf(niy);
    if (seq !== null && seq > max) max = seq;
  }
  return max + 1;
}

// Rakit NIY dari komponen. Mengembalikan { niy, parts, missing }.
export function buildNiy({ birthDateISO, joinDateISO, gender, sequence }) {
  const parts = {
    birth: birthPart(birthDateISO),
    join: joinPart(joinDateISO),
    gender: genderPart(gender),
    sequence: sequence != null && sequence !== '' ? String(sequence).replace(/\D/g, '') : '',
  };
  const missing = [];
  if (!parts.birth) missing.push('tanggal lahir');
  if (!parts.join) missing.push('tanggal masuk');
  if (!parts.gender) missing.push('jenis kelamin');
  if (!parts.sequence) missing.push('nomor urut');
  const niy = missing.length === 0
    ? parts.birth + parts.join + parts.gender + parts.sequence
    : '';
  return { niy, parts, missing };
}
