import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { normalizeImportedEmployeeStatus } from "../src/lib/employee-status-import.mjs";

const statusSource = readFileSync("src/lib/employee-status.ts", "utf8");
const databaseTypes = readFileSync("src/types/database.ts", "utf8");

test("shared employee statuses include Outsource in the approved order", () => {
  const honorer = statusSource.indexOf('{ value: "HONORER", label: "Honorer" }');
  const outsource = statusSource.indexOf('{ value: "OUTSOURCE", label: "Outsource" }');
  const cpty = statusSource.indexOf('{ value: "CPTY", label: "Calon Pegawai Tetap Yayasan" }');

  assert.ok(honorer > -1);
  assert.ok(outsource > honorer);
  assert.ok(cpty > outsource);
});

test("database employee status type includes OUTSOURCE", () => {
  assert.match(
    databaseTypes,
    /employee_status_enum: "MAGANG" \| "HONORER" \| "OUTSOURCE" \| "CPTY" \| "PTY"/,
  );
});

test("Excel status normalization accepts outsource case-insensitively", () => {
  assert.equal(normalizeImportedEmployeeStatus("OUTSOURCE"), "OUTSOURCE");
  assert.equal(normalizeImportedEmployeeStatus(" outsource "), "OUTSOURCE");
});

test("Excel status normalization preserves the CPTY fallback", () => {
  assert.equal(normalizeImportedEmployeeStatus(""), "CPTY");
  assert.equal(normalizeImportedEmployeeStatus("UNKNOWN"), "CPTY");
});

test("outsource migration extends the enum and registration RPC whitelist", () => {
  const migrationPath = "supabase/migrations/040_employee_outsource_status.sql";
  assert.ok(existsSync(migrationPath), "outsource migration must exist");

  const migrationSource = readFileSync(migrationPath, "utf8");
  assert.match(
    migrationSource,
    /alter type public\.employee_status_enum\s+add value if not exists 'OUTSOURCE'/i,
  );
  assert.match(
    migrationSource,
    /p_employee_status in \('MAGANG','HONORER','OUTSOURCE','CPTY','PTY'\)/,
  );
  assert.match(migrationSource, /security definer/i);
  assert.match(migrationSource, /set search_path = public/i);
  assert.match(migrationSource, /revoke all on function public\.submit_employee_registration/i);
  assert.match(migrationSource, /grant execute on function public\.submit_employee_registration/i);
});
