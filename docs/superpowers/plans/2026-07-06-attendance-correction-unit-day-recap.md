# Attendance Correction Unit Day Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count correction recap by unique corrected days, show per-kind day counts, and export filtered Excel data.

**Architecture:** Add one new Supabase RPC that keeps old raw-count RPCs untouched. Update the attendance correction page to call the new RPC with optional date filters, then reuse the existing Excel client component with extra columns.

**Tech Stack:** Next.js App Router, Supabase SQL RPC, TypeScript, xlsx, Node test runner.

---

## File Structure

- Create `supabase/migrations/038_attendance_correction_day_recap.sql`: new day-based RPC.
- Create `src/lib/attendance-correction-recap.mjs` and `.d.ts`: tiny pure aggregation helper for executable rule checks.
- Create `tests/attendance-correction-recap.test.mjs`: verifies duplicate same-day submissions count once.
- Modify `src/types/database.ts`: add new RPC type.
- Modify `src/app/dashboard/attendance-corrections/_components/download-correction-recap-excel.tsx`: add day columns and date range metadata.
- Modify `src/app/dashboard/attendance-corrections/page.tsx`: add filters, use new RPC in Unit Saya and HR/Admin per-employee recap.

### Task 1: Add Day Recap Rule Check

- [ ] **Step 1: Write failing test**

Create `tests/attendance-correction-recap.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import { summarizeCorrectionDays } from "../src/lib/attendance-correction-recap.mjs";

test("summarizeCorrectionDays counts duplicate same-kind submissions once per day", () => {
  assert.deepEqual(
    summarizeCorrectionDays([
      { event_date: "2026-07-06", correction_kind: "LUPA_TAP" },
      { event_date: "2026-07-06", correction_kind: "LUPA_TAP" },
      { event_date: "2026-07-07", correction_kind: "LUPA_TAP" },
    ]),
    {
      total_correction_days: 2,
      lupa_tap_days: 2,
      kartu_tertinggal_days: 0,
      kartu_hilang_rusak_days: 0,
      kendala_sistem_days: 0,
    }
  );
});

test("summarizeCorrectionDays counts one total day when two kinds occur on one date", () => {
  assert.deepEqual(
    summarizeCorrectionDays([
      { event_date: "2026-07-06", correction_kind: "LUPA_TAP" },
      { event_date: "2026-07-06", correction_kind: "KENDALA_SISTEM" },
    ]),
    {
      total_correction_days: 1,
      lupa_tap_days: 1,
      kartu_tertinggal_days: 0,
      kartu_hilang_rusak_days: 0,
      kendala_sistem_days: 1,
    }
  );
});
```

- [ ] **Step 2: Run red check**

Run: `node tests/attendance-correction-recap.test.mjs`

Expected: fails with missing module `attendance-correction-recap.mjs`.

- [ ] **Step 3: Implement helper**

Create `src/lib/attendance-correction-recap.mjs`:

```js
const KIND_KEYS = {
  LUPA_TAP: "lupa_tap_days",
  KARTU_TERTINGGAL: "kartu_tertinggal_days",
  KARTU_HILANG_RUSAK: "kartu_hilang_rusak_days",
  KENDALA_SISTEM: "kendala_sistem_days",
};

export function summarizeCorrectionDays(rows) {
  const totalDates = new Set();
  const byKind = Object.fromEntries(Object.values(KIND_KEYS).map((key) => [key, new Set()]));

  for (const row of rows) {
    if (!row?.event_date) continue;
    totalDates.add(row.event_date);
    const key = KIND_KEYS[row.correction_kind];
    if (key) byKind[key].add(row.event_date);
  }

  return {
    total_correction_days: totalDates.size,
    lupa_tap_days: byKind.lupa_tap_days.size,
    kartu_tertinggal_days: byKind.kartu_tertinggal_days.size,
    kartu_hilang_rusak_days: byKind.kartu_hilang_rusak_days.size,
    kendala_sistem_days: byKind.kendala_sistem_days.size,
  };
}
```

Create `src/lib/attendance-correction-recap.d.ts`:

```ts
export type CorrectionRecapInput = {
  event_date?: string | null;
  correction_kind?: string | null;
};

export type CorrectionDaySummary = {
  total_correction_days: number;
  lupa_tap_days: number;
  kartu_tertinggal_days: number;
  kartu_hilang_rusak_days: number;
  kendala_sistem_days: number;
};

export function summarizeCorrectionDays(rows: CorrectionRecapInput[]): CorrectionDaySummary;
```

- [ ] **Step 4: Run green check**

Run: `node tests/attendance-correction-recap.test.mjs`

Expected: all tests pass.

### Task 2: Add Supabase RPC

- [ ] **Step 1: Add migration**

Create `supabase/migrations/038_attendance_correction_day_recap.sql`:

```sql
-- ============================================================
-- 038: Day-based attendance correction recap
-- ============================================================

CREATE OR REPLACE FUNCTION public.unit_correction_day_recap_active_year(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  total_correction_days BIGINT,
  lupa_tap_days BIGINT,
  kartu_tertinggal_days BIGINT,
  kartu_hilang_rusak_days BIGINT,
  kendala_sistem_days BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.full_name,
    p.employee_no,
    u.name,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true)::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'LUPA_TAP')::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'KARTU_TERTINGGAL')::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'KARTU_HILANG_RUSAK')::BIGINT,
    COUNT(DISTINCT c.event_date) FILTER (WHERE ay.is_active = true AND c.correction_kind = 'KENDALA_SISTEM')::BIGINT
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  LEFT JOIN public.attendance_corrections c
    ON c.user_id = p.id
    AND (p_start_date IS NULL OR c.event_date >= p_start_date)
    AND (p_end_date IS NULL OR c.event_date <= p_end_date)
  LEFT JOIN public.academic_years ay ON ay.id = c.academic_year_id
  WHERE p.active_status = 'AKTIF'
    AND (is_hrd() OR is_admin() OR (
      is_kepala_unit() AND p.home_unit_id IN (
        SELECT unit_id FROM public.user_unit_assignments
        WHERE user_id = auth.uid() AND assignment_type = 'HOME' AND unit_id IS NOT NULL
      )
    ))
  GROUP BY p.id, p.full_name, p.employee_no, u.name
  ORDER BY 5 DESC, p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.unit_correction_day_recap_active_year(DATE, DATE) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.unit_correction_day_recap_active_year(DATE, DATE) TO authenticated;
```

- [ ] **Step 2: Update generated DB type manually**

In `src/types/database.ts`, add this function next to `unit_correction_counts_active_year`:

```ts
      unit_correction_day_recap_active_year: {
        Args: { p_start_date?: string | null; p_end_date?: string | null }
        Returns: {
          user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          total_correction_days: number
          lupa_tap_days: number
          kartu_tertinggal_days: number
          kartu_hilang_rusak_days: number
          kendala_sistem_days: number
        }[]
      }
```

### Task 3: Update Excel Component

- [ ] **Step 1: Expand row type and export columns**

In `download-correction-recap-excel.tsx`, replace `total_corrections` with the day fields. Add optional props:

```ts
dateRange?: { startDate?: string; endDate?: string };
```

Export employee rows with:

```ts
{
  Nama: r.full_name,
  "No. Pegawai": r.employee_no,
  Unit: r.unit_name ?? "-",
  "Hari Dikoreksi": Number(r.total_correction_days),
  "Lupa Tap": Number(r.lupa_tap_days),
  "Kartu Tertinggal": Number(r.kartu_tertinggal_days),
  "Kartu Hilang/Rusak": Number(r.kartu_hilang_rusak_days),
  "Kendala Sistem": Number(r.kendala_sistem_days),
}
```

Add `Tanggal Mulai` and `Tanggal Selesai` to summary sheet from `dateRange`, default `"-"`.

### Task 4: Update Page UI

- [ ] **Step 1: Add date helpers**

In `page.tsx`, add:

```ts
function dateFilterArgs(searchParams: Record<string, string>) {
  return {
    p_start_date: searchParams.correctionStartDate || null,
    p_end_date: searchParams.correctionEndDate || null,
  };
}
```

- [ ] **Step 2: Update UnitCounts**

Call:

```ts
const filters = dateFilterArgs(searchParams);
const { data: rows } = await supabase.rpc("unit_correction_day_recap_active_year", filters);
```

Add a GET filter form in the card header with hidden `tab="unit"`, two date inputs named `correctionStartDate` and `correctionEndDate`, and a submit button.

Add `DownloadCorrectionRecapExcel` in the Unit card header using all filtered rows.

Change table columns to day fields and `Hari Dikoreksi`.

- [ ] **Step 3: Update HR/Admin Recap**

Pass `searchParams` into `Recap`. Use `dateFilterArgs(searchParams)` for `unit_correction_day_recap_active_year`. Add the same filter form above the per-employee table with hidden `tab="rekap"`. Pass `dateRange` into Excel export.

### Task 5: Verify and Commit

- [ ] **Step 1: Run checks**

Run:

```bash
node tests/attendance-correction-recap.test.mjs
npx tsc --noEmit
npm run build
```

Expected: all exit `0`.

- [ ] **Step 2: Commit**

Run:

```bash
git add supabase/migrations/038_attendance_correction_day_recap.sql src/types/database.ts src/app/dashboard/attendance-corrections/page.tsx src/app/dashboard/attendance-corrections/_components/download-correction-recap-excel.tsx src/lib/attendance-correction-recap.mjs src/lib/attendance-correction-recap.d.ts tests/attendance-correction-recap.test.mjs docs/superpowers/plans/2026-07-06-attendance-correction-unit-day-recap.md
git commit -m "feat: add day-based attendance correction recap"
```

