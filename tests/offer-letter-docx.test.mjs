import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import JSZip from "jszip";

import {
  OFFER_LETTER_FIELDS,
  generateOfferLetterDocx,
  normalizeOfferLetterPayload,
} from "../src/lib/offer-letter-docx.mjs";

const expectedFieldNames = [
  "honorific",
  "candidate_name",
  "position_name",
  "unit_name",
  "start_date",
  "employment_status",
  "contract_period",
  "basic_salary",
  "fixed_allowance",
  "take_home_pay",
  "benefits",
  "offer_expiry_date",
  "letter_date",
];

test("exposes the approved offer letter form fields", () => {
  assert.deepEqual(
    OFFER_LETTER_FIELDS.map((field) => field.name),
    expectedFieldNames,
  );
});

test("normalizes all offer letter fields and formats currency", () => {
  const formData = new FormData();
  for (const field of OFFER_LETTER_FIELDS) {
    formData.set(field.name, ` ${field.name} value `);
  }
  formData.set("basic_salary", "2500000");
  formData.set("fixed_allowance", "750000");
  formData.set("take_home_pay", "3250000");

  const payload = normalizeOfferLetterPayload(formData);

  assert.equal(payload.ok, true);
  assert.equal(payload.values.candidate_name, "candidate_name value");
  assert.equal(payload.values.basic_salary, "2.500.000");
  assert.equal(payload.values.fixed_allowance, "750.000");
  assert.equal(payload.values.take_home_pay, "3.250.000");
});

test("formats date fields as Indonesian day month year", () => {
  const formData = new FormData();
  for (const field of OFFER_LETTER_FIELDS) {
    formData.set(field.name, field.name);
  }
  formData.set("start_date", "2026-06-30");
  formData.set("offer_expiry_date", "2026-07-01");
  formData.set("letter_date", "2026-08-17");
  formData.set("basic_salary", "2500000");
  formData.set("fixed_allowance", "750000");
  formData.set("take_home_pay", "3250000");

  const payload = normalizeOfferLetterPayload(formData);

  assert.equal(payload.ok, true);
  assert.equal(payload.values.start_date, "30 Juni 2026");
  assert.equal(payload.values.offer_expiry_date, "1 Juli 2026");
  assert.equal(payload.values.letter_date, "17 Agustus 2026");
});

test("requires every visible offer letter field", () => {
  const payload = normalizeOfferLetterPayload(new FormData());

  assert.equal(payload.ok, false);
  assert.deepEqual(payload.missing, expectedFieldNames);
});

test("generates a docx by replacing template placeholders", async () => {
  const templateBytes = await readFile("dist/template_surat_penawaran_kerja.docx");
  const formData = new FormData();
  for (const field of OFFER_LETTER_FIELDS) {
    formData.set(field.name, `${field.label} Test`);
  }
  formData.set("basic_salary", "2500000");
  formData.set("fixed_allowance", "750000");
  formData.set("take_home_pay", "3250000");
  formData.set("employment_status", "Kontrak");

  const normalized = normalizeOfferLetterPayload(formData);
  assert.equal(normalized.ok, true);

  const bytes = await generateOfferLetterDocx(templateBytes, normalized.values);
  const zip = await JSZip.loadAsync(bytes);
  const documentXml = await zip.file("word/document.xml").async("string");

  assert.ok(bytes.length > 100_000);
  assert.match(documentXml, /Nama Kandidat Test/);
  assert.match(documentXml, /2\.500\.000/);
  assert.match(documentXml, /Kontrak/);
  assert.doesNotMatch(documentXml, /employ(?:<[^>]+>)*ment_status/);
  assert.doesNotMatch(documentXml, /\{\{[^}]+\}\}/);
});
