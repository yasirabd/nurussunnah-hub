# Employee Directory Pagination and Form Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Direktori Pegawai into a server-paginated data table and move create/edit employee forms to full pages.

**Architecture:** Keep employee data loading in server pages, extract table/form UI into local components, and keep existing server actions with `return_to` redirect support. The table page fetches only the current page with Supabase `count: "exact"`; create/edit pages load units, roles, and positions as needed.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase SSR, server actions, shadcn/ui, lucide-react, TypeScript.

---

## Files

- Create: `src/app/dashboard/employees/_components/employee-form-fields.tsx` - shared field sections for create/edit pages.
- Create: `src/app/dashboard/employees/_components/employee-summary.tsx` - compact edit header summary.
- Create: `src/app/dashboard/employees/_components/pagination-controls.tsx` - reusable page-size + first/prev/next/last controls.
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx` - table-only component; remove drawer/forms; use `UserX`.
- Modify: `src/app/dashboard/employees/page.tsx` - server pagination, URL params, paginated counts.
- Modify: `src/app/dashboard/employees/actions.ts` - support `return_to` and success/error redirects to form pages.
- Create: `src/app/dashboard/employees/new/page.tsx` - HRD/Admin create page.
- Create: `src/app/dashboard/employees/[id]/edit/page.tsx` - HRD/Admin full edit + Kepala Unit position-only page.

---

### Task 1: Redirect Helpers

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Add redirect target helper**

Add below `text()`:

```ts
function safeReturnTo(formData: FormData) {
  const value = text(formData, 'return_to');
  return value.startsWith('/dashboard/employees') ? value : '/dashboard/employees';
}

function redirectToPath(path: string, ok: boolean, message: string): never {
  const separator = path.includes('?') ? '&' : '?';
  redirect(`${path}${separator}${ok ? 'success' : 'error'}=${encodeURIComponent(message)}`);
}
```

- [ ] **Step 2: Update profile/role/position actions**

In `updateEmployeeProfileAction`, `updateEmployeeRolesAction`, and `updateEmployeeCurrentPositionAction`, define `const returnTo = safeReturnTo(formData);` near the top. Replace each `redirectWith(...)` in those actions with `redirectToPath(returnTo, ...)`.

- [ ] **Step 3: Update create action error redirect only**

In `createEmployeeAction`, define `const returnTo = safeReturnTo(formData);`. Errors use `redirectToPath(returnTo, false, ...)`; success stays `/dashboard/employees` with success message.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/dashboard/employees/actions.ts
git commit -m "feat: support employee form return redirects"
```

---

### Task 2: Shared Form Components

**Files:**
- Create: `src/app/dashboard/employees/_components/employee-form-fields.tsx`

- [ ] **Step 1: Create shared field component file**

Create `src/app/dashboard/employees/_components/employee-form-fields.tsx` with exported `EmployeeFormFields`, `RoleCheckboxes`, `PositionField`, and local `Field`, `SelectField`, `TextareaField`, `CheckboxField`, `FormSection` helpers. Use names matching server actions: `full_name`, `employee_no`, `email`, `phone`, `home_unit_id`, `employee_status`, `is_active`, `gender`, `marital_status`, `birth_place`, `birth_date`, `last_education`, `study_program`, `address_ktp`, `address_domicile`, `facebook`, `instagram`, `twitter`, role names, `position_name`.

- [ ] **Step 2: Use full-page spacing**

Use `rounded-md border bg-secondary/30 p-4`, `grid gap-4 md:grid-cols-2`, full-width address textareas, visible labels, and helper text for NIY/default password/status.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app/dashboard/employees/_components/employee-form-fields.tsx
git commit -m "feat: add employee form field components"
```

---

### Task 3: Create Employee Page

**Files:**
- Create: `src/app/dashboard/employees/new/page.tsx`

- [ ] **Step 1: Create page**

Create a server page that checks logged-in user roles, redirects non-HRD/Admin to `/dashboard`, loads units ordered by code, renders back link, top error/success messages, and a single `<form action={createEmployeeAction}>` with hidden `return_to="/dashboard/employees/new"`.

- [ ] **Step 2: Render form sections**

Use `EmployeeFormFields`, `RoleCheckboxes` with default `['PEGAWAI']`, `PositionField`, bottom `Batal` link and `Tambah Pegawai` submit button.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app/dashboard/employees/new/page.tsx
git commit -m "feat: add employee create page"
```

---

### Task 4: Edit Employee Page

**Files:**
- Create: `src/app/dashboard/employees/_components/employee-summary.tsx`
- Create: `src/app/dashboard/employees/[id]/edit/page.tsx`

- [ ] **Step 1: Create summary component**

Render employee name, NIY, unit, active badge, employee status, and role badges.

- [ ] **Step 2: Create edit page**

Create server page that loads current user roles, target profile by `params.id`, target roles, current position, and units. HRD/Admin see profile, role, and position forms. Kepala Unit sees only position form; server action keeps scoped authorization.

- [ ] **Step 3: Add forms**

Profile form uses `updateEmployeeProfileAction` and hidden `return_to="/dashboard/employees/${id}/edit"`. Role form uses `updateEmployeeRolesAction`; position form uses `updateEmployeeCurrentPositionAction`. Top messages render `success`/`error` query params.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/dashboard/employees/_components/employee-summary.tsx src/app/dashboard/employees/[id]/edit/page.tsx
git commit -m "feat: add employee edit page"
```

---

### Task 5: Paginated List Page

**Files:**
- Create: `src/app/dashboard/employees/_components/pagination-controls.tsx`
- Modify: `src/app/dashboard/employees/page.tsx`

- [ ] **Step 1: Create pagination component**

Create a client component that receives `page`, `pageSize`, `total`, and current `searchParams`. It renders page-size select `10/25/50`, first/prev/next/last buttons, and text `x-y dari total pegawai`. Changing page size updates URL with `page=1`.

- [ ] **Step 2: Parse pagination in page**

In `page.tsx`, parse `page` and `pageSize`. Clamp `pageSize` to `10 | 25 | 50`, default `10`; clamp `page >= 1`.

- [ ] **Step 3: Query current page only**

Use `.select(columns, { count: 'exact' })`, existing filters, and `.range((page - 1) * pageSize, (page * pageSize) - 1)`.

- [ ] **Step 4: Reset filter page**

Add hidden/default form behavior so filter submissions include `page=1` and current `pageSize`.

- [ ] **Step 5: Render pagination**

Pass total count and params to `PaginationControls` above/below table.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/dashboard/employees/page.tsx src/app/dashboard/employees/_components/pagination-controls.tsx
git commit -m "feat: paginate employee directory"
```

---

### Task 6: Table-Only Component and UserX

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Remove drawer/form code**

Delete local drawer state and `CreateEmployeeForm`, `EditEmployeeTabs`, field helpers, and drawer imports. Keep only table rendering, `PillList`, `statusLabel`, and `DeactivateDialog`.

- [ ] **Step 2: Convert actions to links**

Use `Link` for add/edit. Add button links to `/dashboard/employees/new`; edit button links to `/dashboard/employees/${row.id}/edit`.

- [ ] **Step 3: Replace icon**

Import `UserX` from lucide-react and use it in `DeactivateDialog` instead of `Trash2`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/dashboard/employees/employee-directory-table.tsx
git commit -m "refactor: make employee table navigation only"
```

---

### Task 7: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: TypeScript**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 2: Scoped ESLint**

Run: `npx eslint src --max-warnings=0`

Expected: PASS.

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: completed Next build with no TypeScript or route errors.

- [ ] **Step 4: Manual smoke**

Verify in browser: default 10 rows, page-size dropdown, first/prev/next/last preserve filters, `/new` loads, `/[id]/edit` loads, UserX deactivate dialog, Kepala Unit position-only edit.

- [ ] **Step 5: Commit fixes**

If verification edits files, run:

```bash
git status --short
git add src docs
git commit -m "fix: stabilize employee pagination forms"
```
