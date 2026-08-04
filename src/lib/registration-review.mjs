import { EDUCATION_LEVELS } from "./education.mjs";

const EMPLOYEE_STATUSES = ["MAGANG", "HONORER", "CPTY", "PTY"];
const GENDERS = ["L", "P"];
const MARITAL_STATUSES = ["Belum Kawin", "Kawin", "Cerai Mati", "Cerai Hidup"];
const UNIFORM_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function text(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function nullable(formData, key) {
  return text(formData, key) || null;
}

function normalizePhone(value) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  return compact.startsWith("+")
    ? "+" + compact.slice(1).replace(/\D/g, "")
    : compact.replace(/\D/g, "");
}

function isValidPhone(value) {
  return /^(?:\+?62|0)\d{8,13}$/.test(value);
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function toTitleCaseName(value) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase("id-ID");
      return lower.charAt(0).toLocaleUpperCase("id-ID") + lower.slice(1);
    })
    .join(" ");
}

export function normalizeRegistrationApproval(formData) {
  const fullName = toTitleCaseName(text(formData, "full_name"));
  if (!fullName) return { error: "Nama lengkap wajib diisi." };

  const requiredFields = [
    ["nik", "NIK"],
    ["phone", "No. HP"],
    ["gender", "Jenis kelamin"],
    ["marital_status", "Status perkawinan"],
    ["birth_place", "Tempat lahir"],
    ["birth_date", "Tanggal lahir"],
    ["last_education", "Pendidikan terakhir"],
    ["address_ktp", "Alamat KTP"],
    ["address_domicile", "Alamat domisili"],
    ["home_unit_id", "Unit penempatan"],
    ["position_name", "Jabatan"],
    ["uniform_size", "Ukuran seragam"],
    ["emergency_name", "Nama kontak darurat"],
    ["emergency_relation", "Hubungan kontak darurat"],
    ["emergency_phone", "No. HP kontak darurat"],
    ["join_date", "Tanggal masuk"],
    ["employee_status", "Status pegawai"],
  ];
  for (const [field, label] of requiredFields) {
    if (!text(formData, field)) return { error: `${label} wajib diisi.` };
  }

  const nik = text(formData, "nik").replace(/\D/g, "");
  if (nik.length !== 16) return { error: "NIK harus 16 digit angka." };

  const phone = normalizePhone(text(formData, "phone"));
  if (!isValidPhone(phone)) {
    return { error: "Nomor HP tidak valid. Gunakan format 08xxxx atau +62xxxx." };
  }

  const emergencyPhone = normalizePhone(text(formData, "emergency_phone"));
  if (!isValidPhone(emergencyPhone)) {
    return { error: "Nomor HP kontak darurat tidak valid." };
  }

  const birthDate = text(formData, "birth_date");
  if (!isValidIsoDate(birthDate)) return { error: "Tanggal lahir tidak valid." };

  const joinDate = text(formData, "join_date");
  if (!isValidIsoDate(joinDate)) return { error: "Tanggal masuk tidak valid." };

  const gender = text(formData, "gender");
  if (!GENDERS.includes(gender)) return { error: "Jenis kelamin wajib dipilih." };

  const maritalStatus = text(formData, "marital_status");
  if (!MARITAL_STATUSES.includes(maritalStatus)) {
    return { error: "Status perkawinan wajib dipilih." };
  }

  const lastEducation = text(formData, "last_education");
  if (!EDUCATION_LEVELS.includes(lastEducation)) {
    return { error: "Pendidikan terakhir wajib dipilih." };
  }

  const uniformSize = text(formData, "uniform_size").toUpperCase();
  if (!UNIFORM_SIZES.includes(uniformSize)) {
    return { error: "Ukuran seragam wajib dipilih." };
  }

  const employeeStatus = text(formData, "employee_status");
  if (!EMPLOYEE_STATUSES.includes(employeeStatus)) {
    return { error: "Status pegawai wajib dipilih." };
  }

  return {
    data: {
      full_name: fullName,
      nik,
      phone,
      gender,
      marital_status: maritalStatus,
      birth_place: text(formData, "birth_place"),
      birth_date: birthDate,
      last_education: lastEducation,
      study_program: nullable(formData, "study_program"),
      address_ktp: text(formData, "address_ktp"),
      address_domicile: text(formData, "address_domicile"),
      facebook: nullable(formData, "facebook"),
      instagram: nullable(formData, "instagram"),
      twitter: nullable(formData, "twitter"),
      home_unit_id: text(formData, "home_unit_id"),
      position_name: text(formData, "position_name"),
      uniform_size: uniformSize,
      emergency_name: text(formData, "emergency_name"),
      emergency_relation: text(formData, "emergency_relation"),
      emergency_phone: emergencyPhone,
      note: nullable(formData, "note"),
      join_date: joinDate,
      employee_status: employeeStatus,
    },
  };
}
