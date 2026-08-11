import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  "src/app/dashboard/employees/registrations/actions.ts",
  "utf8",
);

test("approval action validates edits and active unit before account creation", () => {
  assert.match(source, /normalizeRegistrationApproval\(formData\)/);
  assert.match(source, /\.from\("units"\)/);
  assert.match(source, /\.eq\("is_active", true\)/);
  assert.ok(source.indexOf('.from("units")') < source.indexOf("admin.auth.admin.createUser"));
});

test("approval keeps stored email and documents but uses corrected employee data", () => {
  assert.match(source, /email: reg\.email/);
  assert.match(source, /ktp_url: reg\.ktp_url/);
  assert.match(source, /photo_url: reg\.photo_url/);
  assert.match(source, /full_name: approval\.full_name/);
  assert.match(source, /home_unit_id: approval\.home_unit_id/);
  assert.match(source, /position_name: approval\.position_name/);
  assert.match(source, /emergency_name: approval\.emergency_name/);
  assert.match(source, /registrationUpdates/);
});

test("approval surfaces required downstream write failures", () => {
  assert.match(source, /error: roleError/);
  assert.match(source, /error: assignmentError/);
  assert.match(source, /error: positionError/);
  assert.match(source, /error: intakeError/);
  assert.match(source, /error: registrationError/);
  assert.match(source, /\.eq\("status", "MENUNGGU"\)/);
  assert.match(source, /select\("id"\)/);
  assert.match(source, /if \(!updatedRegistration\)/);
});

test("approval allocates NIY by approved status and join date", () => {
  assert.match(source, /resolveEmployeeNo/);
  assert.match(source, /employeeStatus: approval\.employee_status/);
  assert.match(source, /effectiveDate: approval\.join_date/);
  assert.match(source, /mode: "auto"/);
  assert.match(source, /employee_status_effective_date/);
  assert.doesNotMatch(source, /buildNiy/);
  assert.doesNotMatch(source, /nextSequence/);
});
