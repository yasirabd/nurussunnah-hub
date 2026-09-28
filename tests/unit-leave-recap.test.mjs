import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { LEAVE_CATEGORIES, loadUnitLeaveDayRecap, unitLeaveDayRecap, unitLeaveExcelRows } from "../src/lib/unit-leave-recap.mjs";

const employee = (id) => ({ user_id: id, full_name: `Pegawai ${id}`, employee_no: `00${id}`, unit_name: "SD" });
const request = (start, end = start, category = "Sakit", extra = {}) => ({
  user_id: "1", start_date: start, end_date: end, leave_category: category, ...extra,
});
const dates = { startDate: "2026-09-01", endDate: "2026-09-30" };

test("counts unique calendar days within the filter, deduplicating within and across categories", () => {
  const rows = unitLeaveDayRecap([employee("2"), employee("1")], [
    request("2026-08-29", "2026-09-03"),
    request("2026-09-02", "2026-09-04"),
    request("2026-09-03", "2026-09-05", "Keperluan Keluarga"),
    request("2026-09-29", "2026-10-02"),
    request("2026-08-01", "2026-08-31"),
    request("2026-10-01"),
    request("2026-09-01", "2026-09-30", "Sakit", { user_id: "outside-roster" }),
  ], dates.startDate, dates.endDate);
  assert.equal(rows[0].user_id, "1");
  assert.equal(rows[0].total_leave_days, 7);
  assert.deepEqual(rows[0].category_days, { Sakit: 6, "Keperluan Keluarga": 3 });
  assert.equal(rows[1].total_leave_days, 0);
  assert.deepEqual(rows[1].category_days, {});
});

test("all statuses and partial leave count as calendar days, including weekends and leap day", () => {
  const rows = unitLeaveDayRecap([employee("1")], [
    request("2024-02-28", "2024-03-01", "Sakit", { status: "DITOLAK" }),
    request("2024-03-02", "2024-03-02", "Lainnya", { status: "MENUNGGU", leave_time_type: "DATANG_TERLAMBAT" }),
    request("2024-03-02", "2024-03-02", "Lainnya", { status: "PERLU_REVISI", leave_time_type: "PULANG_LEBIH_AWAL" }),
    request("2024-03-03", "2024-03-03", "Lainnya", { status: "DISETUJUI", leave_time_type: "SEBAGIAN_JAM_KERJA" }),
  ], "2024-02-29", "2024-03-03");
  assert.equal(rows[0].total_leave_days, 4);
  assert.deepEqual(rows[0].category_days, { Sakit: 2, Lainnya: 2 });
  assert.equal(unitLeaveDayRecap([employee("1")], [request("2026-09-01", "2026-09-30")], "2026-09-15", "2026-09-15")[0].total_leave_days, 1);
  assert.deepEqual(unitLeaveDayRecap([], [], dates.startDate, dates.endDate), []);
});

function fakeSupabase(employees, requests, failure) {
  const calls = [];
  function query(kind) {
    const filters = [];
    return {
      select(value) { assert.equal(value, "user_id, start_date, end_date, leave_category, academic_years!inner(is_active)"); return this; },
      eq(key, value) { filters.push([key, value]); return this; },
      lte(key, value) { filters.push([key, value]); return this; },
      gte(key, value) { filters.push([key, value]); return this; },
      order(key) { assert.equal(key, kind === "employees" ? "user_id" : "id"); return this; },
      async range(start, end) {
        calls.push([kind, start, end]);
        if (kind === "requests") assert.deepEqual(filters, [
          ["academic_years.is_active", true], ["start_date", dates.endDate], ["end_date", dates.startDate],
        ]);
        if (failure?.kind === kind && failure.start === start) return { data: null, error: new Error("read failed") };
        return { data: (kind === "employees" ? employees : requests).slice(start, end + 1), error: null };
      },
    };
  }
  return {
    calls,
    rpc(name, args) {
      assert.equal(name, "unit_leave_counts_active_year");
      assert.deepEqual(args, { p_start_date: dates.startDate, p_end_date: dates.endDate });
      return query("employees");
    },
    from(name) { assert.equal(name, "leave_requests"); return query("requests"); },
  };
}

test("loads all API pages for employees and requests, exports beyond the visible UI page", async () => {
  const employees = Array.from({ length: 1001 }, (_, index) => employee(String(index)));
  const requests = Array.from({ length: 1001 }, (_, index) => request("2026-09-01", "2026-09-01", "Sakit", { user_id: String(index) }));
  requests.push(request("2026-09-02", "2026-09-02", "Kategori Lama", { user_id: "1000" }));
  const supabase = fakeSupabase(employees, requests);
  const rows = await loadUnitLeaveDayRecap(supabase, dates);
  assert.equal(rows.length, 1001);
  assert.equal(rows[0].user_id, "1000");
  assert.equal(rows[0].total_leave_days, 2);
  assert.deepEqual(supabase.calls, [
    ["employees", 0, 499], ["employees", 500, 999], ["employees", 1000, 1499],
    ["requests", 0, 499], ["requests", 500, 999], ["requests", 1000, 1499],
  ]);
  const exported = unitLeaveExcelRows(rows, [...LEAVE_CATEGORIES, "Kategori Lama"]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exported), "Per Pegawai");
  const roundTrip = XLSX.read(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  const actual = XLSX.utils.sheet_to_json(roundTrip.Sheets["Per Pegawai"]);
  assert.deepEqual(actual, exported);
  assert.equal(actual.length, 1001);
  assert.equal(actual[0]["No. Pegawai"], "001000");
  assert.equal(actual[0]["Kategori Lama (hari)"], 1);
  assert.equal(actual[1]["Kategori Lama (hari)"], 0);
});

test("read failures never return a partial recap; empty roster skips request fetch", async () => {
  const requests = Array.from({ length: 501 }, () => request("2026-09-01"));
  for (const failure of [{ kind: "employees", start: 0 }, { kind: "requests", start: 0 }, { kind: "requests", start: 500 }]) {
    await assert.rejects(loadUnitLeaveDayRecap(fakeSupabase([employee("1")], requests, failure), dates), /read failed/);
  }
  const empty = fakeSupabase([], requests);
  assert.deepEqual(await loadUnitLeaveDayRecap(empty, dates), []);
  assert.equal(empty.calls.length, 1);
});

test("unit UI uses the same applied dates and complete recap for export, with a monthly reset", () => {
  const page = readFileSync(new URL("../src/app/dashboard/leave-requests/page.tsx", import.meta.url), "utf8");
  const unit = page.slice(page.indexOf("async function UnitCounts"), page.indexOf("async function ValidationList"));
  assert.match(unit, /if \(dates\.error\) return filter/);
  assert.match(unit, /loadUnitLeaveDayRecap\(supabase, dates\)/);
  assert.match(unit, /<DownloadUnitLeaveExcel\s+rows=\{allRows\}/);
  assert.match(unit, /startDate=\{dates\.startDate\}\s+endDate=\{dates\.endDate\}/);
  assert.match(unit, /leaveStartDate: dates\.startDate, leaveEndDate: dates\.endDate/);
  assert.match(unit, /total=\{allRows\.length\}/);
  assert.match(page, /tab === "unit" \? "Reset" : "Bulan ini"/);
  assert.match(page, /href=\{`\/dashboard\/leave-requests\?tab=\$\{tab\}`\}/);
});
