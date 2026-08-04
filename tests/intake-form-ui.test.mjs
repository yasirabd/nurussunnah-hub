import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const intake = readFileSync(
  "src/app/dashboard/employees/_components/intake-form-client.tsx",
  "utf8",
);
const fields = readFileSync(
  "src/app/dashboard/employees/_components/employee-form-fields.tsx",
  "utf8",
);

// Field yang punya input sendiri di EmployeeFormFields. Menduplikasinya di
// intake-form-client membuat formData.get() mengambil input pertama di DOM
// (milik EmployeeFormFields) yang kosong, sehingga data intake hilang.
const OWNED_BY_SHARED_FIELDS = [
  "nik",
  "emergency_name",
  "emergency_relation",
  "emergency_phone",
  "uniform_size",
];

test("EmployeeFormFields memang pemilik field bersama tersebut", () => {
  for (const name of OWNED_BY_SHARED_FIELDS) {
    assert.match(fields, new RegExp(`name="${name}"`), `${name} harus ada di EmployeeFormFields`);
  }
});

test("intake tidak menduplikasi field yang sudah dimiliki EmployeeFormFields", () => {
  for (const name of OWNED_BY_SHARED_FIELDS) {
    assert.doesNotMatch(
      intake,
      new RegExp(`name="${name}"`),
      `intake-form-client tidak boleh punya input name="${name}"`,
    );
  }
});

test("intake mengoper seluruh data terurai ke EmployeeFormFields", () => {
  const passedThrough = [
    "nik: parsed.nik",
    "emergency_name: parsed.emergency_name",
    "emergency_relation: parsed.emergency_relation",
    "emergency_phone: parsed.emergency_phone",
    "uniform_size: parsed.uniform_size",
    "ktp_url: parsed.ktp_url",
    "photo_url: parsed.photo_url",
  ];
  for (const line of passedThrough) {
    assert.ok(intake.includes(line), `employee harus mengoper ${line}`);
  }
});

test("URL dokumen tetap ter-submit lewat hidden input", () => {
  // DocRow di EmployeeFormFields hanya menampilkan tautan, bukan input.
  assert.match(intake, /<input type="hidden" name="ktp_url"/);
  assert.match(intake, /<input type="hidden" name="photo_url"/);
  assert.doesNotMatch(fields, /name="ktp_url"/);
  assert.doesNotMatch(fields, /name="photo_url"/);
});

test("seksi Data Intake dan helper matinya sudah dihapus", () => {
  assert.doesNotMatch(intake, /nik_display/);
  assert.doesNotMatch(intake, /Data Intake \(Kontak Darurat/);
  assert.doesNotMatch(intake, /function IntakeField\(/);
  assert.doesNotMatch(intake, /function IntakeLink\(/);
});
