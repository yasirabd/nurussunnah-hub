// Parser untuk baris respons Google Form "Konfirmasi Penawaran Kerja & Data PKWT".
// Sumber: satu baris di-copy dari Google Sheet respons (tab-separated / TSV).
//
// Urutan kolom Sheet (sesuai docs/google-form-konfirmasi-pkwt.md):
//   0  Timestamp
//   1  Email Address (Collect email = ON)
//   2  Nama Lengkap (Surat Penawaran)
//   3  Posisi yang Ditawarkan
//   4  Unit Penempatan
//   5  Bersedia? (Ya/Tidak)
//   6  Alasan menolak
//   7  Nama lengkap sesuai KTP
//   8  NIK
//   9  Tempat lahir
//   10 Tanggal lahir
//   11 Jenis kelamin
//   12 Status pernikahan
//   13 Pendidikan terakhir
//   14 Program studi
//   15 Alamat sesuai KTP
//   16 Domisili sama? (Ya/Tidak)
//   17 Alamat domisili
//   18 Nomor WhatsApp
//   19 Email aktif
//   20 Nama kontak darurat
//   21 Hubungan kontak darurat
//   22 Nomor HP kontak darurat
//   23 Tanggal mulai sesuai surat? (Ya/Tidak)
//   24 Tanggal usulan mulai bekerja
//   25 Keterangan tanggal
//   26 Ukuran seragam
//   27 URL scan/foto KTP
//   28 URL pas foto formal
//   29 (opsional) checkbox pernyataan
//
// Catatan: parser toleran terhadap kolom kosong (branching yang tak diisi).

export const INTAKE_COLUMN_INDEX = {
  timestamp: 0,
  email_address: 1,
  offer_name: 2,
  offer_unit: 3,
  offer_position: 4,
  willing: 5,
  reject_reason: 6,
  full_name: 7,
  nik: 8,
  birth_place: 9,
  birth_date: 10,
  gender: 11,
  marital_status: 12,
  last_education: 13,
  study_program: 14,
  address_ktp: 15,
  address_domicile: 16,
  phone: 17,
  email: 18,
  emergency_name: 19,
  emergency_relation: 20,
  emergency_phone: 21,
  start_matches: 22,
  uniform_size: 25,
  ktp_url: 26,
  photo_url: 27,
};

const GENDER_MAP = {
  'LAKI-LAKI': 'L',
  'LAKI LAKI': 'L',
  'PEREMPUAN': 'P',
  'L': 'L',
  'P': 'P',
};

const MARITAL_MAP = {
  'BELUM KAWIN': 'Belum Kawin',
  'BELUM MENIKAH': 'Belum Kawin',
  'KAWIN': 'Kawin',
  'MENIKAH': 'Kawin',
  'SUDAH MENIKAH': 'Kawin',
  'SUDAH KAWIN': 'Kawin',
  'CERAI MATI': 'Cerai Mati',
  'CERAI HIDUP': 'Cerai Hidup',
  'CERAI': 'Cerai Hidup',
  'DUDA': 'Cerai Mati',
  'JANDA': 'Cerai Mati',
};

export function normalizeMarital(raw) {
  const key = (raw || '').trim().toUpperCase();
  return MARITAL_MAP[key] ?? (raw || '').trim();
}

const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function cell(cols, idx) {
  const v = cols[idx];
  return typeof v === 'string' ? v.trim() : '';
}

function isYes(value) {
  return /^ya\b/i.test((value || '').trim());
}

export function normalizeGender(raw) {
  return GENDER_MAP[(raw || '').trim().toUpperCase()] ?? '';
}

// Konversi tanggal Google Form ke ISO (YYYY-MM-DD).
// Menerima: "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY" (fallback), "D Month YYYY".
export function parseFormDate(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  // ISO langsung
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD/MM/YYYY (locale id) — asumsi hari dulu
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (d <= 31 && mo <= 12) {
      return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  // D Month YYYY
  const months = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
    january: '01', february: '02', march: '03', may: '05', june: '06', july: '07',
    august: '08', october: '10', december: '12',
  };
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${mo}-${String(Number(m[1])).padStart(2, '0')}`;
  }
  return '';
}

export function normalizeUniformSize(raw) {
  const v = (raw || '').trim().toUpperCase();
  return UNIFORM_SIZES.includes(v) ? v : '';
}

// Parse satu baris TSV menjadi objek intake.
// Mengembalikan { data, warnings }.
export function parseIntakeRow(rawLine) {
  const warnings = [];
  const line = (rawLine || '').replace(/\r/g, '');
  if (!line.trim()) {
    return { data: null, warnings: ['Baris kosong.'] };
  }
  const cols = line.split('\t');
  if (cols.length < 3) {
    warnings.push('Kolom terlalu sedikit. Pastikan menyalin satu baris utuh dari Google Sheet (tab-separated).');
  }

  const idx = INTAKE_COLUMN_INDEX;
  const willingRaw = cell(cols, idx.willing);
  const willing = isYes(willingRaw);
  if (willingRaw && !willing) {
    warnings.push('Kandidat menolak penawaran. Periksa kembali sebelum membuat pegawai.');
  }

  const addressKtp = cell(cols, idx.address_ktp);
  const addressDomicile = cell(cols, idx.address_domicile) || addressKtp;

  const gender = normalizeGender(cell(cols, idx.gender));
  if (cell(cols, idx.gender) && !gender) {
    warnings.push('Jenis kelamin tidak dikenali; setel manual.');
  }

  const birthDate = parseFormDate(cell(cols, idx.birth_date));
  if (cell(cols, idx.birth_date) && !birthDate) {
    warnings.push('Format tanggal lahir tidak dikenali; setel manual.');
  }

  const uniformSize = normalizeUniformSize(cell(cols, idx.uniform_size));

  // full_name: utamakan nama sesuai KTP, fallback ke nama surat penawaran.
  const fullName = cell(cols, idx.full_name) || cell(cols, idx.offer_name);
  const email = (cell(cols, idx.email) || cell(cols, idx.email_address)).toLowerCase();

  const data = {
    // profiles
    full_name: fullName,
    nik: cell(cols, idx.nik),
    email,
    phone: cell(cols, idx.phone),
    gender,
    marital_status: normalizeMarital(cell(cols, idx.marital_status)),
    birth_place: cell(cols, idx.birth_place),
    birth_date: birthDate,
    last_education: cell(cols, idx.last_education),
    study_program: cell(cols, idx.study_program),
    address_ktp: addressKtp,
    address_domicile: addressDomicile,
    // acuan (diisi HRD final via dropdown)
    offer_position: cell(cols, idx.offer_position),
    offer_unit: cell(cols, idx.offer_unit),
    // employee_intake
    emergency_name: cell(cols, idx.emergency_name),
    emergency_relation: cell(cols, idx.emergency_relation),
    emergency_phone: cell(cols, idx.emergency_phone),
    uniform_size: uniformSize,
    ktp_url: cell(cols, idx.ktp_url),
    photo_url: cell(cols, idx.photo_url),
  };

  if (!data.full_name) warnings.push('Nama lengkap kosong.');
  if (data.nik && !/^\d{16}$/.test(data.nik)) warnings.push('NIK bukan 16 digit; periksa kembali.');
  if (!data.email) warnings.push('Email kosong; wajib untuk akun login.');

  return { data, warnings };
}
