import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { parseIntakeRow } from "../src/lib/intake-parse.mjs";
import { EDUCATION_LEVELS, normalizeEducation } from "../src/lib/education.mjs";

// Baris asli dari Sheet respons "Konfirmasi Penawaran Kerja & Data PKWT".
const REAL_ROW = [
  "05/07/2026 6:02:05",
  "setiya@smaislamhidayatullah.sch.id",
  "Setiya",
  "SMP-MA",
  "Guru Olahraga",
  "Ya, Saya bersedia bergabung",
  "",
  "Setiya",
  "3322192005710003",
  "Klaten",
  "20/05/1971",
  "Laki-laki",
  "Kawin",
  "D4/S1",
  "Pendidikan Jasmani Kesehatan dan Rekreasi ",
  "Pesona Kutilangsari II N-90 Susukan Ungaran Timur kab Semarang ",
  "Pesona Kutilangsari II N-90 Susukan Ungaran Timur kab Semarang ",
  "081325578242",
  "setiaaja4@gmail.com",
  "Is Ariyanti ",
  "Istri",
  "0896-3740-3563",
  "Ya",
  "",
  "",
  "XL",
  "https://drive.google.com/open?id=1kScl3POi2ZrsPwWKsY-48PwePC6vH_y9",
  "https://drive.google.com/open?id=1A2JkinCvnutKyBL8mNg7iGtX-Sv615ZH",
  "Saya telah membaca dan memahami seluruh isi Surat Penawaran Kerja.",
].join("\t");

test("baris Sheet asli terpetakan ke kolom yang benar", () => {
  const { data, warnings } = parseIntakeRow(REAL_ROW);
  assert.deepEqual(warnings, []);
  assert.deepEqual(data, {
    full_name: "Setiya",
    nik: "3322192005710003",
    email: "setiaaja4@gmail.com",
    phone: "081325578242",
    gender: "L",
    marital_status: "Kawin",
    birth_place: "Klaten",
    birth_date: "1971-05-20",
    last_education: "D4/S1",
    study_program: "Pendidikan Jasmani Kesehatan dan Rekreasi",
    address_ktp: "Pesona Kutilangsari II N-90 Susukan Ungaran Timur kab Semarang",
    address_domicile: "Pesona Kutilangsari II N-90 Susukan Ungaran Timur kab Semarang",
    offer_position: "Guru Olahraga",
    offer_unit: "SMP-MA",
    emergency_name: "Is Ariyanti",
    emergency_relation: "Istri",
    emergency_phone: "089637403563",
    uniform_size: "XL",
    ktp_url: "https://drive.google.com/open?id=1kScl3POi2ZrsPwWKsY-48PwePC6vH_y9",
    photo_url: "https://drive.google.com/open?id=1A2JkinCvnutKyBL8mNg7iGtX-Sv615ZH",
  });
});

test("nilai pendidikan lawas dipetakan ke daftar baru", () => {
  assert.equal(normalizeEducation("SMA/Sederajat"), "SMA/SMK/Sederajat");
  assert.equal(normalizeEducation("D3"), "D1/D2/D3");
  assert.equal(normalizeEducation("S1"), "D4/S1");
  assert.equal(normalizeEducation("S2"), "S2");
  assert.equal(normalizeEducation("Paket C"), "");
});

test("pendidikan tak dikenali memicu peringatan, bukan nilai liar", () => {
  const row = REAL_ROW.split("\t");
  row[13] = "Paket C";
  const { data, warnings } = parseIntakeRow(row.join("\t"));
  assert.equal(data.last_education, "");
  assert.ok(warnings.some((w) => w.includes("Pendidikan terakhir")));
});

test("daftar pendidikan bersumber tunggal dari lib/education.mjs", () => {
  assert.deepEqual(EDUCATION_LEVELS, [
    "SD/Sederajat",
    "SMP/Sederajat",
    "SMA/SMK/Sederajat",
    "D1/D2/D3",
    "D4/S1",
    "S2",
    "S3",
  ]);

  const consumers = [
    "src/lib/registration-review.mjs",
    "src/app/dashboard/profile/actions.ts",
    "src/components/profile/profile-edit-form.tsx",
    "src/app/register/page.tsx",
    "src/app/dashboard/employees/_components/employee-form-fields.tsx",
    "src/app/dashboard/employees/registrations/_components/registration-review.tsx",
  ];
  for (const file of consumers) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /EDUCATION_LEVELS/, `${file} harus memakai EDUCATION_LEVELS`);
    assert.match(source, /education\.mjs/, `${file} harus impor dari lib/education.mjs`);
    assert.doesNotMatch(source, /"SMA\/Sederajat"|'SMA\/Sederajat'/, `${file} masih hardcode daftar lama`);
  }
});
