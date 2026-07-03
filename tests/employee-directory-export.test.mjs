import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const pageSource = readFileSync("src/app/dashboard/employees/page.tsx", "utf8");
const componentPath = "src/app/dashboard/employees/_components/download-employees-excel.tsx";

test("employee directory page wires a non-paginated filtered export dataset", () => {
  assert.match(pageSource, /import \{ DownloadEmployeesExcel \} from "\.\/_components\/download-employees-excel";/);
  assert.match(pageSource, /let exportQuery = supabase\s*\.\s*from\("profiles"\)/);
  assert.match(pageSource, /const \{ data: exportProfiles \}/);
  assert.match(pageSource, /const exportRows = \(exportProfiles \?\? \[\]\) as ProfileRow\[\];/);
  assert.match(pageSource, /exportRows\.map\(\(row\) => row\.id\)/);
  assert.match(pageSource, /<DownloadEmployeesExcel\s+rows=\{exportRows\}/);

  const exportQueryBlock = pageSource.slice(
    pageSource.indexOf("let exportQuery = supabase"),
    pageSource.indexOf("const { data: exportProfiles }")
  );
  assert.equal(exportQueryBlock.includes(".range("), false);
  assert.match(exportQueryBlock, /\.order\("full_name", \{ ascending: true \}\)/);
  assert.match(exportQueryBlock, /if \(q\)/);
  assert.match(exportQueryBlock, /if \(normalizedUnitId\) exportQuery = exportQuery\.eq\("home_unit_id", normalizedUnitId\);/);
  assert.match(exportQueryBlock, /if \(active === "active"\) exportQuery = exportQuery\.eq\("active_status", "AKTIF"\);/);
  assert.match(exportQueryBlock, /if \(active === "inactive"\) exportQuery = exportQuery\.neq\("active_status", "AKTIF"\);/);
});

test("employee excel component exports expected columns and disables empty download", () => {
  const componentSource = readFileSync(componentPath, "utf8");

  assert.match(componentSource, /"use client";/);
  assert.match(componentSource, /import \{ Download \} from "lucide-react";/);
  assert.match(componentSource, /import \* as XLSX from "xlsx";/);
  assert.match(componentSource, /export type EmployeeExportRow = /);
  assert.match(componentSource, /XLSX\.utils\.json_to_sheet/);
  assert.match(componentSource, /XLSX\.writeFile\(wb, `direktori-pegawai-\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}\.xlsx`\)/);
  assert.match(componentSource, /disabled=\{rows\.length === 0\}/);

  for (const column of [
    "Nama",
    "NIY",
    "Email",
    "HP",
    "Jenis Kelamin",
    "Unit",
    "Kode Unit",
    "Status Aktif",
    "Status Pegawai",
    "Role",
  ]) {
    assert.match(componentSource, new RegExp(`${JSON.stringify(column)}:`));
  }
});
