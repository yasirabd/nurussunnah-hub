import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("server NIY resolver supports preserve, auto, and manual modes", () => {
  const path = "src/lib/employee-niy-server.ts";
  assert.ok(existsSync(path), "server NIY helper must exist");
  const source = readFileSync(path, "utf8");
  assert.match(source, /export type EmployeeNoMode = "preserve" \| "auto" \| "manual"/);
  assert.match(source, /export async function resolveEmployeeNo/);
  assert.match(source, /rpc\("allocate_employee_no"/);
  assert.match(source, /validateManualMagangNiy/);
  assert.match(source, /academicYearForDate/);
  assert.match(source, /excludeUserId/);
  assert.match(source, /employee_no_mode/);
});

test("direct employee actions resolve NIY from stored and submitted status", () => {
  const source = readFileSync("src/app/dashboard/employees/actions.ts", "utf8");
  assert.match(source, /resolveEmployeeNo/);
  assert.match(source, /employee_status_effective_date/);
  assert.match(source, /currentProfile\.employee_status === 'MAGANG'/);
  assert.match(source, /payload\.employee_status === 'CPTY'/);
  assert.match(source, /employee_no_mode/);
});
