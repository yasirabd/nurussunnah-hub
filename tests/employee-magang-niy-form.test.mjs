import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("employee form exposes status-aware effective date and NIY mode", () => {
  const source = readFileSync("src/app/dashboard/employees/_components/employee-form-fields.tsx", "utf8");
  assert.match(source, /originalEmployeeStatus/);
  assert.match(source, /employee_status_effective_date/);
  assert.match(source, /Tanggal Mulai Magang/);
  assert.match(source, /Tanggal Pengangkatan CPTY/);
  assert.match(source, /name="employee_no_mode"/);
  assert.match(source, /"preserve"/);
  assert.match(source, /"auto"/);
  assert.match(source, /"manual"/);
  assert.match(source, /academicYearForDate/);
  assert.match(source, /nextMagangSequence/);
  assert.match(source, /buildMagangNiy/);
  assert.match(source, /setEmployeeNoMode\("manual"\)/);
});

test("new and edit pages provide academic years and existing NIYs", () => {
  const newPage = readFileSync("src/app/dashboard/employees/new/page.tsx", "utf8");
  const editPage = readFileSync("src/app/dashboard/employees/[id]/edit/page.tsx", "utf8");
  for (const source of [newPage, editPage]) {
    assert.match(source, /academic_years/);
    assert.match(source, /start_date/);
    assert.match(source, /end_date/);
    assert.match(source, /existingEmployeeNos/);
    assert.match(source, /academicYears/);
  }
  assert.match(editPage, /employee_status_effective_date/);
});
