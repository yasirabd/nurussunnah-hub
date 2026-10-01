import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync("src/lib/timezone.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { todayWIB } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("correction date follows WIB across midnight and the UTC date boundary", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 0 });
  for (const [instant, expected] of [
    ["2026-09-30T16:59:59Z", "2026-09-30"],
    ["2026-09-30T17:00:00Z", "2026-10-01"],
    ["2026-09-30T23:59:59Z", "2026-10-01"],
    ["2026-10-01T00:00:00Z", "2026-10-01"],
    ["2026-10-01T16:59:59Z", "2026-10-01"],
    ["2026-10-01T17:00:00Z", "2026-10-02"],
  ]) {
    t.mock.timers.setTime(Date.parse(instant));
    assert.equal(todayWIB(), expected, instant);
  }
});

test("correction form and RPC both use WIB without relaxing the date rule", () => {
  const form = readFileSync("src/app/dashboard/attendance-corrections/_components/correction-form.tsx", "utf8");
  assert.match(form, /import \{ todayWIB \} from "@\/lib\/timezone"/);
  assert.match(form, /const today = todayWIB\(\)/);
  assert.match(form, /min=\{today\}[\s\S]*max=\{today\}[\s\S]*value=\{today\}/);
  const migration = readFileSync("supabase/migrations/045_attendance_correction_wib.sql", "utf8");
  assert.match(migration, /ALTER FUNCTION public\.submit_attendance_correction\(\s*date, public\.attendance_correction_kind_enum,\s*public\.attendance_time_scope_enum, text, time, time\s*\) SET timezone = 'Asia\/Jakarta';/);
});
