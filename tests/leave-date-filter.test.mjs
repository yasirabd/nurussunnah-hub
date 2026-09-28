import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { leaveDateFilter } from "../src/lib/leave-date-filter.mjs";

test("default period uses the current Jakarta month, including leap years and year rollover", () => {
  for (const [now, startDate, endDate] of [
    ["2026-08-31T17:00:00Z", "2026-09-01", "2026-09-30"],
    ["2024-02-15T00:00:00Z", "2024-02-01", "2024-02-29"],
    ["2026-12-31T17:00:00Z", "2027-01-01", "2027-01-31"],
  ]) {
    assert.deepEqual(leaveDateFilter({}, new Date(now)), { startDate, endDate, error: null });
  }
});

test("custom periods accept equal boundaries and dates across months", () => {
  for (const [startDate, endDate] of [["2026-09-03", "2026-09-03"], ["2026-08-20", "2026-10-05"]]) {
    assert.deepEqual(leaveDateFilter({ leaveStartDate: startDate, leaveEndDate: endDate }), {
      startDate, endDate, error: null,
    });
  }
});

test("invalid calendar dates, empty dates, malformed input and reversed periods are rejected", () => {
  for (const [startDate, endDate] of [
    ["2026-02-29", "2026-03-01"], ["2026-04-31", "2026-05-01"],
    ["", "2026-09-04"], ["2026-09-03", ""],
    ["2026-9-03", "2026-09-04"], ["0000-01-01", "2026-09-04"],
    ["2026-09-03", "2026-13-01"], ["2026-09-05", "2026-09-04"],
  ]) {
    assert.ok(leaveDateFilter({ leaveStartDate: startDate, leaveEndDate: endDate }).error);
  }
});

const sql = readFileSync(new URL("../supabase/migrations/044_leave_recap_date_filter.sql", import.meta.url), "utf8");

test("all four date-filtered RPCs use inclusive overlap and preserve access restrictions", () => {
  const functions = [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(p_start_date DATE, p_end_date DATE\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/g)];
  assert.equal(functions.length, 4);
  for (const [, name, body] of functions) {
    assert.match(body, /lr\.start_date <= p_end_date AND lr\.end_date >= p_start_date/);
    assert.match(body, /p_start_date <= p_end_date/);
    assert.match(body, /ay\.is_active = true/);
    assert.match(body, /p\.active_status = 'AKTIF'/);
    assert.match(body, /is_hrd\(\) OR is_admin\(\)/);
    assert.ok(sql.includes(`REVOKE EXECUTE ON FUNCTION public.${name}(DATE, DATE) FROM anon, public;`));
    assert.ok(sql.includes(`GRANT EXECUTE ON FUNCTION public.${name}(DATE, DATE) TO authenticated;`));
    if (name === "unit_leave_counts_active_year") {
      assert.match(body, /is_kepala_unit\(\) AND p\.home_unit_id IN/);
      assert.match(body, /user_id = auth\.uid\(\) AND assignment_type = 'HOME'/);
      assert.match(body, /LEFT JOIN public\.leave_requests lr ON lr\.user_id = p\.id\s+AND lr\.start_date/);
    } else {
      assert.doesNotMatch(body, /is_kepala_unit/);
    }
  }
});

test("recap UI applies the same date parameters to every RPC, pagination and export", () => {
  const page = readFileSync(new URL("../src/app/dashboard/leave-requests/page.tsx", import.meta.url), "utf8");
  assert.match(page, /if \(dates\.error\) return filter/);
  assert.match(page, /leaveStartDate: dates\.startDate, leaveEndDate: dates\.endDate/);
  for (const name of ["unit_leave_counts_active_year", "leave_recap_by_category_active_year", "leave_recap_by_unit_active_year", "leave_recap_stats_active_year"]) {
    assert.ok(page.includes(`supabase.rpc("${name}", args)`));
  }
  assert.match(page, /startDate=\{dates\.startDate\}/);
  assert.match(page, /endDate=\{dates\.endDate\}/);
  assert.match(page, /results\.some\(\(result\) => result\.error\)/);
});
