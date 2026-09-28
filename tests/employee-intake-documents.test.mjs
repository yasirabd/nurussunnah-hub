import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("src/app/dashboard/employees/actions.ts", "utf8");
const parsed = ts.createSourceFile("actions.ts", source, ts.ScriptTarget.Latest, true);
const helpers = parsed.statements.filter((node) =>
  ts.isFunctionDeclaration(node) &&
  ["text", "nullableText", "intakePayload"].includes(node.name?.text),
);
const { outputText } = ts.transpileModule(
  helpers.map((node) => node.getText(parsed)).join("\n"),
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
);
const intakePayload = runInNewContext(`${outputText}\nintakePayload`);

test("profile edit omits document columns while updating contact and uniform", () => {
  const form = new FormData();
  form.set("emergency_name", "New contact");
  form.set("uniform_size", "l");
  const payload = intakePayload(form);
  assert.equal(Object.hasOwn(payload, "ktp_url"), false);
  assert.equal(Object.hasOwn(payload, "photo_url"), false);
  assert.equal(payload.emergency_name, "New contact");
  assert.equal(payload.uniform_size, "L");

  const action = parsed.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === "updateEmployeeProfileAction",
  ).getText(parsed);
  assert.match(action, /\.from\('employee_intake'\)\s*\.upsert\(\{ user_id: id, \.\.\.intakePayload\(formData\) \}/);
});

test("intake creation retains submitted document links", () => {
  const form = new FormData();
  form.set("ktp_url", " https://example.com/ktp ");
  form.set("photo_url", "https://example.com/photo");
  const payload = intakePayload(form);
  assert.equal(payload.ktp_url, "https://example.com/ktp");
  assert.equal(payload.photo_url, "https://example.com/photo");
});

test("document fields are independent and explicit empty values remain null", () => {
  for (const field of ["ktp_url", "photo_url"]) {
    const form = new FormData();
    form.set(field, "   ");
    const payload = intakePayload(form);
    assert.equal(payload[field], null);
    const otherField = field === "ktp_url" ? "photo_url" : "ktp_url";
    assert.equal(Object.hasOwn(payload, otherField), false);
  }
});
