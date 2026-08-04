import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const action = readFileSync("src/app/register/actions.ts", "utf8");
const page = readFileSync("src/app/register/page.tsx", "utf8");
const fileField = readFileSync(
  "src/app/register/_components/registration-file-field.tsx",
  "utf8",
);

test("submit validates the invite before uploading documents to Drive", () => {
  const check = action.indexOf('rpc("check_employee_invite"');
  const upload = action.indexOf("uploadFilesToNewFolder(");
  assert.ok(check > -1, "action must pre-check the invite code");
  assert.ok(upload > -1);
  assert.ok(check < upload, "invite check must run before the Drive upload");
});

test("submit button reports pending state and blocks double submission", () => {
  assert.match(page, /import \{ SubmitButton \} from "@\/components\/ui\/submit-button"/);
  assert.match(page, /<SubmitButton pendingText="Mengirim data\.\.\.">/);
  assert.doesNotMatch(page, /<Button type="submit">/);
});

test("registration documents are compressed in the browser before submit", () => {
  assert.match(fileField, /^"use client";/);
  assert.match(fileField, /prepareEvidenceFiles\(selected\)/);
  assert.match(fileField, /replaceInputFiles\(input, prepared\.files\)/);
  assert.match(fileField, /EVIDENCE_MAX_TOTAL_BYTES/);
  assert.match(fileField, /disabled=\{preparing\}/);
});

test("register page routes both document inputs through the compressing field", () => {
  assert.match(page, /import \{ RegistrationFileField \} from "\.\/_components\/registration-file-field"/);
  assert.match(page, /<RegistrationFileField[\s\S]*name="ktp_file"/);
  assert.match(page, /<RegistrationFileField[\s\S]*name="photo_file"/);
  assert.doesNotMatch(page, /function FileField\(/);
});

test("register page shows the submit error instead of the generic gate", () => {
  const errorParam = page.indexOf('param(sp, "error")');
  const gateCheck = page.indexOf('rpc("check_employee_invite"');
  assert.ok(errorParam > -1 && gateCheck > -1);
  assert.ok(errorParam < gateCheck, "error must be read before the invite gate");
  assert.match(page, /<Gate\s+message=\{[\s\S]*error \|\|/);
});
