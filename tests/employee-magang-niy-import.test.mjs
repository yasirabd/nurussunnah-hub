import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const wizard = readFileSync(
  "src/app/dashboard/employees/_components/import-wizard-client.tsx",
  "utf8",
);
const actions = readFileSync("src/app/dashboard/employees/actions.ts", "utf8");

test("Excel import reads TANGGAL MULAI MAGANG", () => {
  assert.match(wizard, /TANGGAL MULAI MAGANG/);
  assert.match(wizard, /employee_status_effective_date/);
});

test("blank Magang NIY is allocated instead of using the honorer fallback", () => {
  assert.match(actions, /normalizeImportedEmployeeStatus/);
  assert.match(actions, /resolveEmployeeNo/);
  assert.match(actions, /employeeStatus === 'MAGANG'/);
  assert.match(actions, /mode: employeeNo \? 'manual' : 'auto'/);
  assert.match(actions, /effectiveDate/);
  assert.match(actions, /employee_status_effective_date: effectiveDate/);
  assert.match(wizard, /row\.employee_status\.trim\(\)\.toUpperCase\(\) !== "MAGANG"/);
});
