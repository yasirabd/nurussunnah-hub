import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeRegistrationApproval,
  toTitleCaseName,
} from "../src/lib/registration-review.mjs";

function validFormData() {
  const formData = new FormData();
  const values = {
    full_name: "  AHMAD   FAUZI ",
    nik: "3273010101010001",
    phone: "0812-3456-7890",
    gender: "L",
    marital_status: "Belum Kawin",
    birth_place: "Bandung",
    birth_date: "1990-01-01",
    last_education: "D4/S1",
    study_program: "Teknik Informatika",
    address_ktp: "Jl. Contoh",
    address_domicile: "Jl. Contoh",
    facebook: "",
    instagram: "@ahmad",
    twitter: "",
    home_unit_id: "unit-1",
    position_name: "Guru",
    uniform_size: "L",
    emergency_name: "Fatimah",
    emergency_relation: "Istri",
    emergency_phone: "+62 812-0000-1111",
    note: "  Perlu konfirmasi jadwal  ",
    join_date: "2026-08-01",
    employee_status: "CPTY",
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

test("toTitleCaseName normalizes case and whitespace", () => {
  assert.equal(toTitleCaseName("AHMAD FAUZI"), "Ahmad Fauzi");
  assert.equal(toTitleCaseName("ahmad fauzi"), "Ahmad Fauzi");
  assert.equal(toTitleCaseName("  aHmAd   fAuZi  "), "Ahmad Fauzi");
  assert.equal(toTitleCaseName("nurul-aini"), "Nurul-aini");
});

test("normalizeRegistrationApproval returns corrected approval data", () => {
  const result = normalizeRegistrationApproval(validFormData());
  assert.equal(result.error, undefined);
  assert.equal(result.data.full_name, "Ahmad Fauzi");
  assert.equal(result.data.nik, "3273010101010001");
  assert.equal(result.data.phone, "081234567890");
  assert.equal(result.data.emergency_phone, "+6281200001111");
  assert.equal(result.data.facebook, null);
  assert.equal(result.data.note, "Perlu konfirmasi jadwal");
});

test("normalizeRegistrationApproval accepts outsource employees", () => {
  const formData = validFormData();
  formData.set("employee_status", "OUTSOURCE");

  const result = normalizeRegistrationApproval(formData);
  assert.equal(result.error, undefined);
  assert.equal(result.data.employee_status, "OUTSOURCE");
});

test("normalizeRegistrationApproval rejects missing required data", () => {
  const formData = validFormData();
  formData.set("full_name", "");
  assert.deepEqual(normalizeRegistrationApproval(formData), {
    error: "Nama lengkap wajib diisi.",
  });
});

test("normalizeRegistrationApproval rejects invalid constrained values", () => {
  const invalidNik = validFormData();
  invalidNik.set("nik", "123");
  assert.deepEqual(normalizeRegistrationApproval(invalidNik), {
    error: "NIK harus 16 digit angka.",
  });

  const invalidStatus = validFormData();
  invalidStatus.set("employee_status", "INVALID");
  assert.deepEqual(normalizeRegistrationApproval(invalidStatus), {
    error: "Status pegawai wajib dipilih.",
  });
});

test("normalizeRegistrationApproval rejects invalid phone and enum values", () => {
  const invalidPhone = validFormData();
  invalidPhone.set("phone", "12345");
  assert.deepEqual(normalizeRegistrationApproval(invalidPhone), {
    error: "Nomor HP tidak valid. Gunakan format 08xxxx atau +62xxxx.",
  });

  const invalidUniform = validFormData();
  invalidUniform.set("uniform_size", "XXXXL");
  assert.deepEqual(normalizeRegistrationApproval(invalidUniform), {
    error: "Ukuran seragam wajib dipilih.",
  });
});

test("normalizeRegistrationApproval rejects malformed calendar dates", () => {
  const invalidBirthDate = validFormData();
  invalidBirthDate.set("birth_date", "2026-99-99");
  assert.deepEqual(normalizeRegistrationApproval(invalidBirthDate), {
    error: "Tanggal lahir tidak valid.",
  });

  const invalidJoinDate = validFormData();
  invalidJoinDate.set("join_date", "2026-02-30");
  assert.deepEqual(normalizeRegistrationApproval(invalidJoinDate), {
    error: "Tanggal masuk tidak valid.",
  });
});
