# Magang Academic-Year NIY Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate collision-safe Magang NIY values in the `MAG-<academic-year-start>-<sequence>` format and regenerate a regular NIY when Magang employees become CPTY.

**Architecture:** Extend the pure NIY helper for previews and validation, while a security-definer PostgreSQL RPC reserves the authoritative number atomically. Server actions choose preserve, automatic, or manual NIY handling and all employee-entry paths share the same rules.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, Supabase/PostgreSQL

---

## File Structure

- Modify `src/lib/niy.mjs`: add academic-year Magang parsing, formatting, preview, and validation helpers.
- Create `src/lib/niy.d.mts`: type the existing and new NIY helpers.
- Create `src/lib/employee-niy-server.ts`: centralize academic-year lookup, manual validation, and RPC allocation.
- Create `supabase/migrations/041_magang_academic_year_niy.sql`: add the effective-date column, counter table, and atomic allocator RPC.
- Modify `src/types/database.ts`: expose the column, counter table, and RPC.
- Modify `src/app/dashboard/employees/_components/employee-form-fields.tsx`: add status-aware dates, preview, and NIY mode.
- Modify employee new/edit/intake pages to provide academic years and existing NIYs.
- Modify direct employee, registration approval, intake, and import actions to allocate or validate NIY server-side.
- Modify import parsing to support `TANGGAL MULAI MAGANG`.
- Add focused behavioral and source-contract tests.

### Task 1: Pure Magang NIY Rules

**Files:**
- Create: `tests/niy.test.mjs`
- Modify: `src/lib/niy.mjs`
- Create: `src/lib/niy.d.mts`

- [ ] **Step 1: Write failing helper tests**

Create `tests/niy.test.mjs` with tests that import the existing regular helpers plus:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  academicYearForDate,
  buildMagangNiy,
  nextMagangSequence,
  parseMagangNiy,
  validateManualMagangNiy,
} from "../src/lib/niy.mjs";

const years = [
  { id: "tp-2025", start_date: "2025-07-01", end_date: "2026-06-30" },
  { id: "tp-2026", start_date: "2026-07-01", end_date: "2027-06-30" },
];

test("academicYearForDate uses the academic-year start year", () => {
  assert.deepEqual(academicYearForDate("2026-08-01", years), {
    id: "tp-2026",
    startYear: 2026,
  });
});

test("academicYearForDate rejects missing and overlapping years", () => {
  assert.deepEqual(academicYearForDate("2024-01-01", years), {
    error: "Tanggal tidak termasuk Tahun Pelajaran mana pun.",
  });
  assert.deepEqual(
    academicYearForDate("2026-08-01", [...years, { id: "overlap", start_date: "2026-08-01", end_date: "2026-12-31" }]),
    { error: "Tanggal termasuk lebih dari satu Tahun Pelajaran." },
  );
});

test("Magang NIY formatting resets and follows stored manual numbers", () => {
  assert.equal(buildMagangNiy(2026, 1), "MAG-2026-001");
  assert.equal(nextMagangSequence(["MAG-2026-001", "MAG-2026-010", "MAG-2025-099"], 2026), 11);
  assert.equal(nextMagangSequence(["MAG-2026-010"], 2027), 1);
});

test("manual Magang NIY must match the effective academic year", () => {
  assert.deepEqual(parseMagangNiy(" mag-2026-010 "), { year: 2026, sequence: 10, niy: "MAG-2026-010" });
  assert.deepEqual(validateManualMagangNiy("MAG-2025-010", 2026), {
    error: "Tahun pada NIY Magang harus sesuai Tahun Pelajaran tanggal mulai.",
  });
  assert.deepEqual(validateManualMagangNiy("MAG-2026-000", 2026), {
    error: "NIY Magang harus mengikuti format MAG-YYYY-NNN dengan urutan 001-999.",
  });
});
```

- [ ] **Step 2: Run the test and verify missing-export failures**

Run: `node --test tests/niy.test.mjs`

Expected: FAIL because the Magang helper exports do not exist.

- [ ] **Step 3: Implement the pure helpers**

Add to `src/lib/niy.mjs`:

```js
export function academicYearForDate(dateISO, academicYears) {
  const matches = (academicYears || []).filter(
    (year) => dateISO && year.start_date <= dateISO && dateISO <= year.end_date,
  );
  if (matches.length === 0) return { error: "Tanggal tidak termasuk Tahun Pelajaran mana pun." };
  if (matches.length > 1) return { error: "Tanggal termasuk lebih dari satu Tahun Pelajaran." };
  return { id: matches[0].id, startYear: Number(matches[0].start_date.slice(0, 4)) };
}

export function parseMagangNiy(value) {
  const niy = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = niy.match(/^MAG-(\d{4})-(\d{3})$/);
  if (!match) return null;
  const sequence = Number(match[2]);
  if (sequence < 1 || sequence > 999) return null;
  return { year: Number(match[1]), sequence, niy };
}

export function buildMagangNiy(startYear, sequence) {
  if (!Number.isInteger(startYear) || !Number.isInteger(sequence) || sequence < 1 || sequence > 999) return "";
  return `MAG-${startYear}-${String(sequence).padStart(3, "0")}`;
}

export function nextMagangSequence(existingNiys, startYear) {
  let max = 0;
  for (const value of existingNiys || []) {
    const parsed = parseMagangNiy(value);
    if (parsed?.year === startYear && parsed.sequence > max) max = parsed.sequence;
  }
  return max + 1;
}

export function validateManualMagangNiy(value, startYear) {
  const parsed = parseMagangNiy(value);
  if (!parsed) return { error: "NIY Magang harus mengikuti format MAG-YYYY-NNN dengan urutan 001-999." };
  if (parsed.year !== startYear) return { error: "Tahun pada NIY Magang harus sesuai Tahun Pelajaran tanggal mulai." };
  return { niy: parsed.niy };
}
```

Create `src/lib/niy.d.mts` with declarations for existing helpers and the new academic-year helpers.

- [ ] **Step 4: Run focused tests and TypeScript**

Run: `node --test tests/niy.test.mjs`

Expected: all NIY tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add tests/niy.test.mjs src/lib/niy.mjs src/lib/niy.d.mts
git commit -m "feat: add academic-year Magang NIY rules"
```

### Task 2: Atomic Database Allocation

**Files:**
- Create: `tests/magang-niy-migration.test.mjs`
- Create: `supabase/migrations/041_magang_academic_year_niy.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write a failing migration contract test**

Create `tests/magang-niy-migration.test.mjs` that asserts the migration contains:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("Magang NIY migration adds storage and a protected allocator", () => {
  const path = "supabase/migrations/041_magang_academic_year_niy.sql";
  assert.ok(existsSync(path));
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
```

- [ ] **Step 2: Run the test and verify the migration is missing**

Run: `node --test tests/magang-niy-migration.test.mjs`

Expected: FAIL because migration 041 does not exist.

- [ ] **Step 3: Add migration 041**

Create a forward-only migration that:

```sql
alter table public.profiles
  add column employee_status_effective_date date;

create table public.employee_no_counters (
  series_key text primary key,
  last_value integer not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

alter table public.employee_no_counters enable row level security;
revoke all on table public.employee_no_counters from public, anon, authenticated;
```

Add `public.allocate_employee_no(p_employee_status text, p_effective_date date, p_birth_date date default null, p_gender text default null) returns text`. The function must:

- Reject unauthenticated callers and callers without `HRD` or `ADMIN` in `user_roles`.
- Validate the employee status against `MAGANG`, `HONORER`, `OUTSOURCE`, `CPTY`, and `PTY`.
- For `MAGANG`, find exactly one academic year containing `p_effective_date`, derive `extract(year from start_date)`, lock `MAG:<academic_year_id>`, compare the counter to valid stored `MAG-YYYY-NNN` values, reject values above 999, and return a padded NIY.
- For all other statuses, require birth date and gender, lock `REGULAR`, compare the counter to numeric NIY suffixes after the 14-character fixed prefix, and return the existing regular format.
- Revoke execute from `public` and grant it only to `authenticated`.

Update `src/types/database.ts` so `profiles` Row/Insert/Update contain `employee_status_effective_date`, `employee_no_counters` is typed, and Functions contains:

```ts
allocate_employee_no: {
  Args: {
    p_employee_status: string
    p_effective_date: string
    p_birth_date?: string | null
    p_gender?: string | null
  }
  Returns: string
}
```

- [ ] **Step 4: Run migration contract, tests, and TypeScript**

Run: `node --test tests/magang-niy-migration.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add tests/magang-niy-migration.test.mjs supabase/migrations/041_magang_academic_year_niy.sql src/types/database.ts
git commit -m "feat: add atomic employee NIY allocation"
```

### Task 3: Server NIY Orchestration

**Files:**
- Create: `src/lib/employee-niy-server.ts`
- Create: `tests/employee-niy-server.test.mjs`
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Write failing source and validation tests**

Test that `employee-niy-server.ts` exports an allocator, validates manual Magang NIY against academic years, checks duplicate NIY excluding the edited user, and calls `allocate_employee_no`. Add source-contract assertions that direct create/update actions pass stored status, effective date, NIY mode, birth date, and gender through the helper.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/employee-niy-server.test.mjs`

Expected: FAIL because the server helper does not exist.

- [ ] **Step 3: Implement the server helper**

Create these public operations in `src/lib/employee-niy-server.ts`:

```ts
export type EmployeeNoMode = "preserve" | "auto" | "manual";

export async function resolveEmployeeNo({
  supabase,
  mode,
  submittedEmployeeNo,
  employeeStatus,
  effectiveDate,
  birthDate,
  gender,
  currentEmployeeNo,
  excludeUserId,
}: ResolveEmployeeNoInput): Promise<{ employeeNo: string } | { error: string }>;
```

Behavior:

- `preserve` returns the stored NIY and is permitted only during update.
- `auto` calls `allocate_employee_no` with normalized inputs.
- `manual` normalizes uppercase/no-spaces, validates Magang format and academic year when status is `MAGANG`, and checks uniqueness in `profiles`.
- `MAGANG` always requires an effective date.
- A transition from Magang to CPTY is detected by the update action from the stored profile and requires an effective date even if the client submits another mode.

Refactor direct employee create/update actions to use the helper. Store `employee_status_effective_date` only for a Magang save or Magang-to-CPTY transition; preserve it for unrelated edits.

- [ ] **Step 4: Run focused tests and TypeScript**

Run: `node --test tests/employee-niy-server.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/employee-niy-server.ts src/app/dashboard/employees/actions.ts tests/employee-niy-server.test.mjs
git commit -m "feat: enforce server-side NIY transitions"
```

### Task 4: Status-Aware Employee Form

**Files:**
- Modify: `src/app/dashboard/employees/_components/employee-form-fields.tsx`
- Modify: `src/app/dashboard/employees/new/page.tsx`
- Modify: `src/app/dashboard/employees/[id]/edit/page.tsx`
- Create: `tests/employee-magang-niy-form.test.mjs`

- [ ] **Step 1: Write failing UI contract tests**

Assert that the shared form:

- Tracks employee status and original status.
- Renders `employee_status_effective_date` as Tanggal Mulai Magang for `MAGANG`.
- Renders Tanggal Pengangkatan CPTY for a stored Magang changing to CPTY.
- Includes hidden `employee_no_mode` with `preserve`, `auto`, or `manual`.
- Uses `academicYearForDate`, `nextMagangSequence`, and `buildMagangNiy` for provisional previews.
- Switches to manual mode when NIY is edited.

- [ ] **Step 2: Run the UI test and verify failure**

Run: `node --test tests/employee-magang-niy-form.test.mjs`

Expected: FAIL because conditional employment date and NIY mode are absent.

- [ ] **Step 3: Implement the controlled fields**

Extend `EmployeeFormValue` with `employee_status_effective_date`. Add props for academic years and existing NIYs. Track status, NIY, date, birth date, gender, and NIY mode.

Initial modes:

- Existing records: `preserve`.
- New non-Magang records: `manual`.
- Selecting Magang or changing its date: `auto` and fill the provisional Magang preview.
- Changing stored Magang to CPTY: `auto` and fill a provisional regular preview.
- Editing the NIY input: `manual`.

New and edit pages query `academic_years(id,start_date,end_date)` and `profiles(employee_no)`, pass them to the form, and include `employee_status_effective_date` in profile selection.

- [ ] **Step 4: Run UI tests and TypeScript**

Run: `node --test tests/employee-magang-niy-form.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/employees/_components/employee-form-fields.tsx src/app/dashboard/employees/new/page.tsx src/app/dashboard/employees/[id]/edit/page.tsx tests/employee-magang-niy-form.test.mjs
git commit -m "feat: add status-aware NIY form controls"
```

### Task 5: Registration, Intake, and Excel Import

**Files:**
- Modify: `src/app/dashboard/employees/registrations/actions.ts`
- Modify: `src/app/dashboard/employees/_components/intake-form-client.tsx`
- Modify: `src/app/dashboard/employees/intake/page.tsx`
- Modify: `src/app/dashboard/employees/_components/import-wizard-client.tsx`
- Modify: `src/app/dashboard/employees/actions.ts`
- Modify: relevant registration, intake, and import tests.

- [ ] **Step 1: Write failing integration contract tests**

Add assertions that:

- Registration approval calls the server allocator with `approval.employee_status` and `approval.join_date` instead of directly calling `buildNiy`.
- Intake passes academic years/existing NIYs and uses the selected status for its preview.
- Import recognizes `TANGGAL MULAI MAGANG`.
- Blank Magang NIY is allocated server-side and never replaced by `H-<row>`.
- Manual imported Magang NIY is validated against its effective academic year.

- [ ] **Step 2: Run focused integration tests and verify failure**

Run: `node --test tests/registration-approval-action.test.mjs tests/intake-form-ui.test.mjs tests/employee-magang-niy-import.test.mjs`

Expected: failures identify the old direct generator and `H-<row>` fallback.

- [ ] **Step 3: Implement all entry paths**

Registration approval uses automatic mode with `join_date`. Intake owns selected-status state, uses its Tanggal Masuk value as the effective date, and submits NIY mode/date. Import adds `employee_status_effective_date` to `BulkImportRow`, parses Excel dates, and allocates Magang NIY for blank values. Non-Magang blank import rows retain the existing fallback.

Persist `employee_status_effective_date` on profiles and registration approval results where applicable.

- [ ] **Step 4: Run focused tests and TypeScript**

Run: `node --test tests/registration-approval-action.test.mjs tests/intake-form-ui.test.mjs tests/employee-magang-niy-import.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/employees/registrations/actions.ts src/app/dashboard/employees/_components/intake-form-client.tsx src/app/dashboard/employees/intake/page.tsx src/app/dashboard/employees/_components/import-wizard-client.tsx src/app/dashboard/employees/actions.ts tests
git commit -m "feat: use Magang NIY across employee intake paths"
```

### Task 6: Full Verification

**Files:**
- Verify all files changed in Tasks 1-5.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 2: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Check committed diff formatting**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Next.js build completes and generates final manifests.

- [ ] **Step 5: Inspect final branch state**

Run: `git status --short`

Expected: no uncommitted implementation changes; unrelated user-owned files remain untouched.
