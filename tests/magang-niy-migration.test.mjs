import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("Magang NIY migration adds storage and a protected allocator", () => {
  const path = "supabase/migrations/041_magang_academic_year_niy.sql";
  assert.ok(existsSync(path), "migration 041 must exist");
  const source = readFileSync(path, "utf8");
  assert.match(source, /add column employee_status_effective_date date/i);
  assert.match(source, /create table public\.employee_no_counters/i);
  assert.match(source, /create or replace function public\.allocate_employee_no/i);
  assert.match(source, /for update/i);
  assert.match(source, /greatest\(v_counter, v_existing_max\) \+ 1/i);
  assert.match(source, /security definer/i);
  assert.match(source, /set search_path = public/i);
  assert.match(source, /grant execute .* to authenticated/is);
  assert.match(source, /revoke all .* from public/is);
});

test("database types expose NIY counter storage and allocator", () => {
  const source = readFileSync("src/types/database.ts", "utf8");
  assert.match(source, /employee_no_counters: \{/);
  assert.match(source, /employee_status_effective_date: string \| null/);
  assert.match(source, /allocate_employee_no: \{/);
});
