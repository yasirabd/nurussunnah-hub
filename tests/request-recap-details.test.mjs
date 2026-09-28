import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as XLSX from "xlsx";
import * as detailsModule from "../src/lib/request-recap-details.mjs";
import * as correctionModule from "../src/lib/attendance-correction-recap.mjs";
import * as leaveModule from "../src/lib/unit-leave-recap.mjs";

const employee = { user_id: "1", full_name: "Pegawai", employee_no: "001", unit_name: "SD" };
const request = { id: "1", user_id: "1", start_date: "2026-08-31", end_date: "2026-09-02", leave_category: "Sakit", event_date: "2026-09-01", correction_kind: "LUPA_TAP", reason: "=alasan literal", status: "DITOLAK" };

function fakeSupabase(rows, failureOffset) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      return {
        select(fields) { calls.push(["select", fields]); return this; },
        eq(...args) { calls.push(["eq", ...args]); return this; },
        gte(...args) { calls.push(["gte", ...args]); return this; },
        lte(...args) { calls.push(["lte", ...args]); return this; },
        order(...args) { calls.push(["order", ...args]); return this; },
        async range(start, end) {
          calls.push(["range", start, end]);
          return start === failureOffset ? { error: new Error("read failed") } : { data: rows.slice(start, end + 1) };
        },
      };
    },
  };
}

test("detail loader paginates, restricts the roster and active year, keeps overlapping leave dates and reasons", async () => {
  const db = fakeSupabase([...Array.from({ length: 1001 }, () => request), { ...request, user_id: "outside-roster" }]);
  const rows = await detailsModule.loadRequestRecapDetails(db, "leave_requests", [employee], "2026-09-01", "2026-09-30");
  assert.equal(rows.length, 1001);
  assert.deepEqual(rows[0], { Nama: "Pegawai", "No. Pegawai": "001", Unit: "SD", "Tanggal Mulai": "2026-08-31", "Tanggal Selesai": "2026-09-02", "Jenis Izin": "Sakit", Alasan: "=alasan literal", Status: "DITOLAK" });
  assert.deepEqual(db.calls.filter(([method]) => ["eq", "gte", "lte"].includes(method)).slice(0, 3), [
    ["eq", "academic_years.is_active", true], ["gte", "end_date", "2026-09-01"], ["lte", "start_date", "2026-09-30"],
  ]);
  assert.deepEqual(db.calls.filter(([method]) => method === "range"), [["range", 0, 499], ["range", 500, 999], ["range", 1000, 1499]]);
});

test("correction details use event dates, optional bounds, readable kinds; failures never return partial data", async () => {
  const db = fakeSupabase([request]);
  const rows = await detailsModule.loadRequestRecapDetails(db, "attendance_corrections", [employee], null, "2026-09-30");
  assert.equal(rows[0].Tanggal, "2026-09-01");
  assert.equal(rows[0]["Jenis Koreksi"], "Lupa Tap Kartu");
  assert.equal(db.calls.some(([method]) => method === "gte"), false);
  assert.deepEqual(db.calls.find(([method]) => method === "lte"), ["lte", "event_date", "2026-09-30"]);
  await assert.rejects(detailsModule.loadRequestRecapDetails(fakeSupabase(Array(501).fill(request), 500), "leave_requests", [employee], null, null), /read failed/);
  const empty = fakeSupabase([]);
  assert.deepEqual(await detailsModule.loadRequestRecapDetails(empty, "leave_requests", [], null, null), []);
  assert.equal(empty.calls.length, 0);
  await assert.rejects(detailsModule.loadRequestRecapDetails(empty, "profiles", [], null, null), /Invalid recap table/);
});

const require = createRequire(import.meta.url);
for (const [file, component, isLeave] of [
  ["leave-requests/_components/download-leave-recap-excel.tsx", "DownloadLeaveRecapExcel", true],
  ["leave-requests/_components/download-unit-leave-excel.tsx", "DownloadUnitLeaveExcel", true],
  ["attendance-corrections/_components/download-correction-recap-excel.tsx", "DownloadCorrectionRecapExcel", false],
]) {
  test(`${component} downloads required sheets with literal reasons and dates, including empty details`, async () => {
    const source = readFileSync(new URL(`../src/app/dashboard/${file}`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    let workbook;
    const exports = {};
    runInNewContext(output, { exports, require: (name) => {
      if (name === "xlsx") return { ...XLSX, writeFile: (value) => { workbook = value; } };
      if (name === "lucide-react") return { Download: () => null };
      if (name === "@/lib/request-recap-details.mjs") return detailsModule;
      if (name === "@/lib/attendance-correction-recap.mjs") return correctionModule;
      if (name === "@/lib/unit-leave-recap.mjs") return leaveModule;
      return require(name);
    } });
    const details = await detailsModule.loadRequestRecapDetails(fakeSupabase([request]), isLeave ? "leave_requests" : "attendance_corrections", [employee], null, null);
    for (const detailRows of [details, []]) {
      for (const includeKindAndUnitSheets of [true, false]) {
        const row = { ...employee, total_leaves: 1, total_leave_days: 1, category_days: { Sakit: 1 }, total_correction_days: 1, lupa_tap_days: 1, kartu_tertinggal_days: 0, kartu_hilang_rusak_days: 0, kendala_sistem_days: 0 };
        exports[component]({ perEmployee: [row], rows: [row], details: detailRows, categories: ["Sakit"], byCategory: [], byKind: [], byUnit: [], stats: { total_requests: 1, distinct_employees: 1 }, yearName: "2026/2027", startDate: "2026-09-01", endDate: "2026-09-30", includeKindAndUnitSheets }).props.onClick();
        const actual = XLSX.read(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
        for (const name of ["Ringkasan", "Per Pegawai", "Detail Per Pegawai"]) assert.ok(actual.SheetNames.includes(name));
        const sheet = actual.Sheets["Detail Per Pegawai"];
        assert.deepEqual(XLSX.utils.sheet_to_json(sheet), detailRows);
        assert.ok(XLSX.utils.sheet_to_json(sheet, { header: 1 })[0].includes("Alasan"));
        if (detailRows.length) {
          const reasonCell = sheet[isLeave ? "G2" : "F2"];
          assert.equal(reasonCell.t, "s");
          assert.equal(reasonCell.f, undefined);
        }
      }
    }
  });
}
