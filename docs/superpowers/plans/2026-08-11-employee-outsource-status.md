# Employee Outsource Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `OUTSOURCE` as a complete employee category across database storage, application validation and display, registration, and Excel import without changing access behavior.

**Architecture:** Extend the existing PostgreSQL enum through a forward-only migration and keep `active_status` as the sole lifecycle/access signal. Continue using the shared employee-status option map for UI behavior, while extracting Excel status normalization into a small testable JavaScript module.

**Tech Stack:** Next.js 16, TypeScript, Node test runner, Supabase/PostgreSQL migrations, React server actions

---

## File Structure

- Modify `src/lib/employee-status.ts`: add the shared `OUTSOURCE` option and label.
- Modify `src/types/database.ts`: add `OUTSOURCE` to the generated enum union used throughout the app.
- Modify `src/lib/registration-review.mjs`: accept `OUTSOURCE` during registration approval validation.
- Modify `src/lib/registration-review.d.mts`: expose `OUTSOURCE` in the approval result type.
- Create `src/lib/employee-status-import.mjs`: provide testable Excel status normalization.
- Create `src/lib/employee-status-import.d.mts`: type the normalization helper for TypeScript callers.
- Modify `src/app/dashboard/employees/actions.ts`: use the extracted import normalizer.
- Create `supabase/migrations/040_employee_outsource_status.sql`: extend the enum and update the current registration RPC whitelist.
- Create `tests/employee-outsource-status.test.mjs`: verify shared options, types, import normalization, and migration coverage.
- Modify `tests/registration-review.test.mjs`: verify approval normalization accepts `OUTSOURCE`.

### Task 1: Application Status Option and Registration Validation

**Files:**
- Create: `tests/employee-outsource-status.test.mjs`
- Modify: `tests/registration-review.test.mjs`
- Modify: `src/lib/employee-status.ts`
- Modify: `src/types/database.ts`
- Modify: `src/lib/registration-review.mjs`
- Modify: `src/lib/registration-review.d.mts`

- [ ] **Step 1: Write failing option, type, and registration tests**

Create the initial `tests/employee-outsource-status.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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
```

Add this test to `tests/registration-review.test.mjs`:

```js
test("normalizeRegistrationApproval accepts outsource employees", () => {
  const formData = validFormData();
  formData.set("employee_status", "OUTSOURCE");

  const result = normalizeRegistrationApproval(formData);
  assert.equal(result.error, undefined);
  assert.equal(result.data.employee_status, "OUTSOURCE");
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/employee-outsource-status.test.mjs tests/registration-review.test.mjs`

Expected: failures show that the shared option, database union, and registration whitelist do not yet contain `OUTSOURCE`.

- [ ] **Step 3: Add the shared option and validation values**

Update `EMPLOYEE_STATUS_OPTIONS` in `src/lib/employee-status.ts`:

```ts
export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "MAGANG", label: "Magang" },
  { value: "HONORER", label: "Honorer" },
  { value: "OUTSOURCE", label: "Outsource" },
  { value: "CPTY", label: "Calon Pegawai Tetap Yayasan" },
  { value: "PTY", label: "Pegawai Tetap Yayasan" },
] as const satisfies readonly { value: EmployeeStatus; label: string }[];
```

Update the enum union in `src/types/database.ts`:

```ts
employee_status_enum: "MAGANG" | "HONORER" | "OUTSOURCE" | "CPTY" | "PTY"
```

Update the whitelist in `src/lib/registration-review.mjs`:

```js
const EMPLOYEE_STATUSES = ["MAGANG", "HONORER", "OUTSOURCE", "CPTY", "PTY"];
```

Update `RegistrationApprovalData` in `src/lib/registration-review.d.mts`:

```ts
employee_status: "MAGANG" | "HONORER" | "OUTSOURCE" | "CPTY" | "PTY";
```

- [ ] **Step 4: Run focused tests and TypeScript verification**

Run: `node --test tests/employee-outsource-status.test.mjs tests/registration-review.test.mjs`

Expected: all focused tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit the application status changes**

```bash
git add tests/employee-outsource-status.test.mjs tests/registration-review.test.mjs src/lib/employee-status.ts src/types/database.ts src/lib/registration-review.mjs src/lib/registration-review.d.mts
git commit -m "feat: add outsource employee status"
```

### Task 2: Testable Excel Import Normalization

**Files:**
- Modify: `tests/employee-outsource-status.test.mjs`
- Create: `src/lib/employee-status-import.mjs`
- Create: `src/lib/employee-status-import.d.mts`
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Write failing behavioral import tests**

Add this import to `tests/employee-outsource-status.test.mjs`:

```js
import { normalizeImportedEmployeeStatus } from "../src/lib/employee-status-import.mjs";
```

Add these tests:

```js
test("Excel status normalization accepts outsource case-insensitively", () => {
  assert.equal(normalizeImportedEmployeeStatus("OUTSOURCE"), "OUTSOURCE");
  assert.equal(normalizeImportedEmployeeStatus(" outsource "), "OUTSOURCE");
});

test("Excel status normalization preserves the CPTY fallback", () => {
  assert.equal(normalizeImportedEmployeeStatus(""), "CPTY");
  assert.equal(normalizeImportedEmployeeStatus("UNKNOWN"), "CPTY");
});
```

- [ ] **Step 2: Run the test and verify module-not-found failure**

Run: `node --test tests/employee-outsource-status.test.mjs`

Expected: FAIL because `src/lib/employee-status-import.mjs` does not exist.

- [ ] **Step 3: Implement the import normalizer**

Create `src/lib/employee-status-import.mjs`:

```js
const EMPLOYEE_STATUS_MAP = {
  PTY: "PTY",
  HONORER: "HONORER",
  OUTSOURCE: "OUTSOURCE",
  MAGANG: "MAGANG",
  CPTY: "CPTY",
  "CALON PTY": "CPTY",
};

export function normalizeImportedEmployeeStatus(raw) {
  const key = String(raw ?? "").trim().toUpperCase();
  return EMPLOYEE_STATUS_MAP[key] ?? "CPTY";
}
```

Create `src/lib/employee-status-import.d.mts`:

```ts
export type ImportedEmployeeStatus = "MAGANG" | "HONORER" | "OUTSOURCE" | "CPTY" | "PTY";

export function normalizeImportedEmployeeStatus(raw: unknown): ImportedEmployeeStatus;
```

Import it in `src/app/dashboard/employees/actions.ts`:

```ts
import { normalizeImportedEmployeeStatus } from '@/lib/employee-status-import.mjs';
```

Remove the local `EMPLOYEE_STATUS_MAP` and `normalizeEmployeeStatus` declarations. Change the bulk profile payload to:

```ts
employee_status: normalizeImportedEmployeeStatus(row.employee_status),
```

- [ ] **Step 4: Run focused tests and TypeScript verification**

Run: `node --test tests/employee-outsource-status.test.mjs`

Expected: all tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 5: Commit the import normalization changes**

```bash
git add tests/employee-outsource-status.test.mjs src/lib/employee-status-import.mjs src/lib/employee-status-import.d.mts src/app/dashboard/employees/actions.ts
git commit -m "refactor: centralize employee status import normalization"
```

### Task 3: Database Enum and Registration RPC

**Files:**
- Modify: `tests/employee-outsource-status.test.mjs`
- Create: `supabase/migrations/040_employee_outsource_status.sql`

- [ ] **Step 1: Write a failing migration contract test**

Add to `tests/employee-outsource-status.test.mjs`:

```js
const migrationSource = readFileSync(
  "supabase/migrations/040_employee_outsource_status.sql",
  "utf8",
);

test("outsource migration extends the enum and registration RPC whitelist", () => {
  assert.match(
    migrationSource,
    /alter type public\.employee_status_enum add value if not exists 'OUTSOURCE'/i,
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
```

- [ ] **Step 2: Run the migration contract test and verify failure**

Run: `node --test tests/employee-outsource-status.test.mjs`

Expected: FAIL because `supabase/migrations/040_employee_outsource_status.sql` does not exist.

- [ ] **Step 3: Add the forward-only database migration**

Create `supabase/migrations/040_employee_outsource_status.sql`. Begin with:

```sql
-- Add Outsource as an employment category without changing lifecycle behavior.

alter type public.employee_status_enum
  add value if not exists 'OUTSOURCE' after 'HONORER';
```

Then include the current 27-argument `public.submit_employee_registration` definition from `supabase/migrations/036_registration_intake_alignment.sql`, preserving its signature, validation, insert fields, `security definer`, and `set search_path = public`. Change only its employee-status expression to:

```sql
(case when p_employee_status in ('MAGANG','HONORER','OUTSOURCE','CPTY','PTY')
  then p_employee_status else 'CPTY' end)::employee_status_enum,
```

End with the same explicit privileges used by migration 036:

```sql
revoke all on function public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text,
  text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_employee_registration(
  text, text, text, text, text, text, text, text, date, text, text, text, text,
  text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;
```

- [ ] **Step 4: Run migration contract and repository consistency checks**

Run: `node --test tests/employee-outsource-status.test.mjs`

Expected: all tests pass.

Run: `rg -n "MAGANG.*HONORER.*CPTY.*PTY|employee_status_enum:" src supabase/migrations/040_employee_outsource_status.sql tests/employee-outsource-status.test.mjs`

Expected: current application whitelists and type unions include `OUTSOURCE`; historical migrations may retain their original values.

- [ ] **Step 5: Commit the database migration**

```bash
git add tests/employee-outsource-status.test.mjs supabase/migrations/040_employee_outsource_status.sql
git commit -m "feat: persist outsource employee status"
```

### Task 4: Full Verification

**Files:**
- Verify all changed files from Tasks 1-3.

- [ ] **Step 1: Run the full Node test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run TypeScript validation**

Run: `npx tsc --noEmit`

Expected: exit code 0 with no diagnostics.

- [ ] **Step 3: Run formatting and diff validation**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 5: Confirm final scope**

Run: `git status --short`

Expected: no uncommitted implementation changes. Any unrelated user-owned files must remain untouched.
