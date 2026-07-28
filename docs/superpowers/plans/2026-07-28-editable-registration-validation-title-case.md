# Editable Registration Validation and Full-Name Title Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let HRD edit registration data except email and documents during approval, while normalizing only Full Name to Title Case on blur and again on the server.

**Architecture:** Add a framework-independent registration-review normalization module used by the client and server. Convert the review dialog into one editable approval form, pass active unit options from the server page, and make the approval action validate and use the submitted corrections while retaining stored email and document references.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Node.js built-in test runner.

---

### Task 1: Full-name and approval-payload normalization

**Files:**
- Create: `src/lib/registration-review.mjs`
- Create: `src/lib/registration-review.d.ts`
- Create: `tests/registration-review.test.mjs`

- [ ] **Step 1: Write failing full-name normalization tests**

Create `tests/registration-review.test.mjs` with assertions that `toTitleCaseName` converts uppercase, lowercase, mixed-case, and repeated whitespace to one consistent result while leaving punctuation inside a word under the same simple casing rule.

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeRegistrationApproval,
  toTitleCaseName,
} from "../src/lib/registration-review.mjs";

test("toTitleCaseName normalizes case and whitespace", () => {
  assert.equal(toTitleCaseName("AHMAD FAUZI"), "Ahmad Fauzi");
  assert.equal(toTitleCaseName("ahmad fauzi"), "Ahmad Fauzi");
  assert.equal(toTitleCaseName("  aHmAd   fAuZi  "), "Ahmad Fauzi");
  assert.equal(toTitleCaseName("nurul-aini"), "Nurul-aini");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/registration-review.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/registration-review.mjs`.

- [ ] **Step 3: Implement the minimal full-name utility**

Create `src/lib/registration-review.mjs`:

```js
export function toTitleCaseName(value) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase("id-ID");
      return lower.charAt(0).toLocaleUpperCase("id-ID") + lower.slice(1);
    })
    .join(" ");
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/registration-review.test.mjs`

Expected: 1 passing test.

- [ ] **Step 5: Add failing approval-payload tests**

Extend `tests/registration-review.test.mjs` with a `validFormData()` helper and tests for normalized full name/NIK/phones, nullable optional values, and rejection of missing required fields, invalid enumerations, invalid NIK, and invalid phones.

```js
function validFormData() {
  const formData = new FormData();
  const values = {
    full_name: "  AHMAD   FAUZI ",
    nik: "3273010101010001",
    phone: "0812-3456-7890",
    gender: "L",
    marital_status: "Belum Kawin",
    birth_place: "Bandung",
    birth_date: "1990-01-01",
    last_education: "S1",
    study_program: "Teknik Informatika",
    address_ktp: "Jl. Contoh",
    address_domicile: "Jl. Contoh",
    facebook: "",
    instagram: "@ahmad",
    twitter: "",
    home_unit_id: "unit-1",
    position_name: "Guru",
    uniform_size: "L",
    emergency_name: "Fatimah",
    emergency_relation: "Istri",
    emergency_phone: "+62 812-0000-1111",
    note: "  Perlu konfirmasi jadwal  ",
    join_date: "2026-08-01",
    employee_status: "CPTY",
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

test("normalizeRegistrationApproval returns corrected approval data", () => {
  const result = normalizeRegistrationApproval(validFormData());
  assert.equal(result.error, undefined);
  assert.equal(result.data.full_name, "Ahmad Fauzi");
  assert.equal(result.data.nik, "3273010101010001");
  assert.equal(result.data.phone, "081234567890");
  assert.equal(result.data.emergency_phone, "+6281200001111");
  assert.equal(result.data.facebook, null);
  assert.equal(result.data.note, "Perlu konfirmasi jadwal");
});

test("normalizeRegistrationApproval rejects invalid required data", () => {
  const formData = validFormData();
  formData.set("full_name", "");
  assert.deepEqual(normalizeRegistrationApproval(formData), {
    error: "Nama lengkap wajib diisi.",
  });
});

test("normalizeRegistrationApproval rejects invalid constrained values", () => {
  const invalidNik = validFormData();
  invalidNik.set("nik", "123");
  assert.deepEqual(normalizeRegistrationApproval(invalidNik), {
    error: "NIK harus 16 digit angka.",
  });

  const invalidStatus = validFormData();
  invalidStatus.set("employee_status", "INVALID");
  assert.deepEqual(normalizeRegistrationApproval(invalidStatus), {
    error: "Status pegawai wajib dipilih.",
  });
});
```

- [ ] **Step 6: Run tests and verify RED**

Run: `node --test tests/registration-review.test.mjs`

Expected: FAIL because `normalizeRegistrationApproval` is not exported.

- [ ] **Step 7: Implement approval normalization and declarations**

Add constants, `text`, `nullable`, phone normalization, required-field validation, enum validation, and `normalizeRegistrationApproval(formData)` to `src/lib/registration-review.mjs`. The returned `data` object must contain exactly the editable fields plus `join_date` and `employee_status`; it must not accept email or document URLs.

Create `src/lib/registration-review.d.ts` with:

```ts
export type RegistrationApprovalData = {
  full_name: string;
  nik: string;
  phone: string;
  gender: "L" | "P";
  marital_status: string;
  birth_place: string;
  birth_date: string;
  last_education: string;
  study_program: string | null;
  address_ktp: string;
  address_domicile: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  home_unit_id: string;
  position_name: string;
  uniform_size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL";
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  note: string | null;
  join_date: string;
  employee_status: "MAGANG" | "HONORER" | "CPTY" | "PTY";
};

export function toTitleCaseName(value: unknown): string;
export function normalizeRegistrationApproval(
  formData: FormData,
): { data: RegistrationApprovalData; error?: never } | { data?: never; error: string };
```

- [ ] **Step 8: Run tests and commit**

Run: `node --test tests/registration-review.test.mjs`

Expected: all registration-review tests PASS.

```powershell
git add src/lib/registration-review.mjs src/lib/registration-review.d.ts tests/registration-review.test.mjs
git commit -m "feat: validate registration approval edits"
```

### Task 2: Editable registration review form

**Files:**
- Modify: `src/app/dashboard/employees/registrations/_components/registration-review.tsx`
- Create: `tests/registration-review-ui.test.mjs`

- [ ] **Step 1: Write a failing UI source-contract test**

Create `tests/registration-review-ui.test.mjs` to verify that the review imports `toTitleCaseName`, owns `fullName` state, applies it from the Full Name `onBlur`, includes editable controls for representative fields, keeps email out of an editable input, and renders document links.

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  "src/app/dashboard/employees/registrations/_components/registration-review.tsx",
  "utf8",
);

test("registration review edits registration fields and title-cases full name", () => {
  assert.match(source, /toTitleCaseName/);
  assert.match(source, /useState\(reg\.full_name\)/);
  assert.match(source, /name="full_name"/);
  assert.match(source, /onBlur=.*toTitleCaseName/s);
  assert.match(source, /name="nik"/);
  assert.match(source, /name="home_unit_id"/);
  assert.match(source, /name="position_name"/);
  assert.match(source, /name="emergency_name"/);
  assert.doesNotMatch(source, /name="email"/);
  assert.match(source, /reg\.email/);
  assert.match(source, /DocButton/);
});
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node --test tests/registration-review-ui.test.mjs`

Expected: FAIL because the current dialog is read-only and does not import `toTitleCaseName`.

- [ ] **Step 3: Convert the dialog into one editable form**

Update `RegistrationDetail` to include `home_unit_id`. Add a `UnitOption` type and accept `units: UnitOption[]`. Import `useState`, `Textarea`, and `toTitleCaseName`. Replace read-only `Item` rows with labeled inputs, selects, and textareas for all editable fields from the design.

Use a controlled Full Name input:

```tsx
const [fullName, setFullName] = useState(reg.full_name);

<Input
  id={`full_name_${reg.id}`}
  name="full_name"
  value={fullName}
  onChange={(event) => setFullName(event.currentTarget.value)}
  onBlur={(event) => setFullName(toTitleCaseName(event.currentTarget.value))}
  required
/>
```

Render email as text without `name="email"`. Preserve `DocButton` for KTP and photo. Put all editable registration controls, join date, employee status, hidden registration ID, and the approval button inside the same `approveRegistrationAction` form. Keep rejection as its own form.

- [ ] **Step 4: Run UI test and type check**

Run: `node --test tests/registration-review-ui.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: FAIL only where the registrations page has not yet supplied `home_unit_id` and `units`; those are addressed in Task 3.

- [ ] **Step 5: Commit the form change with its test**

Do not commit until Task 3 restores type safety; stage this task together with Task 3.

### Task 3: Supply active unit choices to every review dialog

**Files:**
- Modify: `src/app/dashboard/employees/registrations/page.tsx`
- Test: `tests/registration-review-ui.test.mjs`

- [ ] **Step 1: Extend the failing UI contract**

Add assertions that the page queries active units and passes both the selected `home_unit_id` and the unit list into `RegistrationReview`.

```js
const pageSource = readFileSync(
  "src/app/dashboard/employees/registrations/page.tsx",
  "utf8",
);

test("registrations page supplies active unit choices", () => {
  assert.match(pageSource, /\.from\("units"\)/);
  assert.match(pageSource, /\.eq\("is_active", true\)/);
  assert.match(pageSource, /home_unit_id: r\.home_unit_id/);
  assert.match(pageSource, /<RegistrationReview reg=\{detail\} units=\{/);
});
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node --test tests/registration-review-ui.test.mjs`

Expected: the new page test FAILS.

- [ ] **Step 3: Fetch and pass active units**

In `page.tsx`, query `units` for `id, name, code`, filter `is_active = true`, and order by code. Add `home_unit_id: r.home_unit_id` to `RegistrationDetail`. Pass `units={units ?? []}` to each review component. Keep `employee_status` as the raw stored enum for the select default; use `EMPLOYEE_STATUS_LABELS` only in the table badge.

- [ ] **Step 4: Run tests and type check**

Run: `node --test tests/registration-review-ui.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit Tasks 2 and 3**

```powershell
git add src/app/dashboard/employees/registrations/_components/registration-review.tsx src/app/dashboard/employees/registrations/page.tsx tests/registration-review-ui.test.mjs
git commit -m "feat: edit employee data during registration review"
```

### Task 4: Use corrected values during approval

**Files:**
- Modify: `src/app/dashboard/employees/registrations/actions.ts`
- Create: `tests/registration-approval-action.test.mjs`

- [ ] **Step 1: Write a failing action source-contract test**

Create `tests/registration-approval-action.test.mjs` to require server normalization, active-unit validation before auth creation, immutable stored email/documents, corrected values in downstream writes, and corrected registration audit data.

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  "src/app/dashboard/employees/registrations/actions.ts",
  "utf8",
);

test("approval action validates edits before creating the account", () => {
  assert.match(source, /normalizeRegistrationApproval\(formData\)/);
  assert.match(source, /\.from\("units"\)/);
  assert.match(source, /\.eq\("is_active", true\)/);
  assert.ok(source.indexOf('from("units")') < source.indexOf("admin.auth.admin.createUser"));
});

test("approval keeps stored email and documents but uses corrected employee data", () => {
  assert.match(source, /email: reg\.email/);
  assert.match(source, /ktp_url: reg\.ktp_url/);
  assert.match(source, /photo_url: reg\.photo_url/);
  assert.match(source, /full_name: approval\.full_name/);
  assert.match(source, /home_unit_id: approval\.home_unit_id/);
  assert.match(source, /position_name: approval\.position_name/);
  assert.match(source, /emergency_name: approval\.emergency_name/);
});
```

- [ ] **Step 2: Run the action test and verify RED**

Run: `node --test tests/registration-approval-action.test.mjs`

Expected: FAIL because the action currently reads editable values from `reg`.

- [ ] **Step 3: Parse and validate submitted edits**

Import `normalizeRegistrationApproval`. At the start of `approveRegistrationAction`, retain only ID parsing before fetching the pending registration, then call:

```ts
const normalized = normalizeRegistrationApproval(formData);
if (normalized.error) redirectWith(false, normalized.error);
const approval = normalized.data;
```

Check the selected unit before auth creation:

```ts
const { data: selectedUnit } = await supabase
  .from("units")
  .select("id")
  .eq("id", approval.home_unit_id)
  .eq("is_active", true)
  .maybeSingle();
if (!selectedUnit) redirectWith(false, "Unit penempatan tidak valid atau sudah tidak aktif.");
```

- [ ] **Step 4: Replace mutable registration reads with corrected approval data**

Use `approval.birth_date`, `approval.join_date`, and `approval.gender` for NIY generation. Use `approval.full_name` for auth metadata, profile, success copy, and Drive folder naming. Use all other `approval` fields for profile, unit assignment, position history, and intake. Continue using `reg.email`, `reg.ktp_url`, `reg.photo_url`, and `reg.drive_folder_id` for immutable data.

The final registration update must include status/reviewer fields and the corrected editable registration fields:

```ts
await supabase.from("employee_registrations").update({
  ...approval,
  join_date: undefined,
  status: "DISETUJUI",
  employee_no: employeeNo,
  reviewed_by: reviewerId,
  reviewed_at: new Date().toISOString(),
});
```

Do not literally send `join_date`; instead destructure it out before building the update object because the registration table has no `join_date` column:

```ts
const { join_date: _joinDate, ...registrationUpdates } = approval;
```

- [ ] **Step 5: Run focused tests and type check**

Run: `node --test tests/registration-review.test.mjs tests/registration-review-ui.test.mjs tests/registration-approval-action.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit the action integration**

```powershell
git add src/app/dashboard/employees/registrations/actions.ts tests/registration-approval-action.test.mjs
git commit -m "feat: approve registrations with corrected data"
```

### Task 5: Full verification

**Files:**
- Verify: all files changed in Tasks 1-4

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: all tests PASS with no failures.

- [ ] **Step 2: Run TypeScript checking**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Check the final diff**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: a clean tree after the task commits.
