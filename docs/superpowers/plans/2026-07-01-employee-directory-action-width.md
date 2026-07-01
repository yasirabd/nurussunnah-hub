# Employee Directory Action Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `Jabatan` column from the employee directory table and keep `Aksi` buttons visible without horizontal scrolling in the common table width.

**Architecture:** This is a scoped UI-only change in the existing employee directory client table. The table keeps all existing permissions, actions, and data inputs; only rendered columns and cell layout classes change.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn-style table components, Node test runner.

---

### Task 1: Employee Directory Table Columns

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`
- Test: `tests/employee-directory-table-ui.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/employee-directory-table-ui.test.mjs`:

```js
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  "src/app/dashboard/employees/employee-directory-table.tsx",
  "utf8",
);

test("employee directory hides Jabatan and sizes actions compactly", () => {
  assert.equal(source.includes("<TableHead>Jabatan</TableHead>"), false);
  assert.match(source, /<TableCell colSpan=\{6\}/);
  assert.match(source, /<TableHead className="w-\[132px\] text-right">Aksi<\/TableHead>/);
  assert.match(source, /<TableCell className="w-\[132px\]">/);
  assert.match(source, /className="flex items-center justify-end gap-1 whitespace-nowrap"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/employee-directory-table-ui.test.mjs`

Expected: FAIL because `Jabatan` still exists, `colSpan` is `7`, and action width classes are absent.

- [ ] **Step 3: Write minimal implementation**

In `src/app/dashboard/employees/employee-directory-table.tsx`:

```tsx
<TableHead>Pegawai</TableHead>
<TableHead>Unit</TableHead>
<TableHead>Role</TableHead>
<TableHead>Kontak</TableHead>
<TableHead>Status</TableHead>
<TableHead className="w-[132px] text-right">Aksi</TableHead>
```

Remove the `Jabatan` `<TableCell>` that renders `positionsByUser`.

Change empty state:

```tsx
<TableCell colSpan={6} className="text-center text-muted-foreground">
```

Change action cell:

```tsx
<TableCell className="w-[132px]">
  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
```

- [ ] **Step 4: Run targeted test**

Run: `npm test -- tests/employee-directory-table-ui.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run project verification**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected: both commands complete without errors.
