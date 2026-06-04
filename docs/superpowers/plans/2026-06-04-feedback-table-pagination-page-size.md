# Feedback Table Pagination Page Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add employee-directory-style pagination with page-size dropdowns to Feedback Monitoring and Feedback Teridentifikasi tables.

**Architecture:** Extract reusable data pagination controls from the employee directory, then use the generic component in both employee and feedback pages. Feedback continues loading RPC arrays and slices them in the server component using independent page/page-size params per table.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase RPC data, server components, client pagination component, shadcn/ui, lucide-react, TypeScript.

---

## Files

- Create: `src/components/ui/data-pagination.tsx` - generic pagination footer with page-size dropdown and first/prev/next/last controls.
- Modify: `src/app/dashboard/employees/_components/pagination-controls.tsx` - replace employee-specific implementation with wrapper around generic component.
- Modify: `src/app/dashboard/feedback/page.tsx` - parse `monitorPageSize` and `identifiedPageSize`, slice by page size, replace old table footer pagination.

---

### Task 1: Generic Data Pagination Component

**Files:**
- Create: `src/components/ui/data-pagination.tsx`

- [ ] **Step 1: Create component**

Create `src/components/ui/data-pagination.tsx` by adapting the employee pagination footer. Props: `basePath`, `searchParams`, `pageParam`, `pageSizeParam`, `page`, `pageSize`, `total`, `itemLabel`.

- [ ] **Step 2: Implement URL updates**

Use `URLSearchParams`. Preserve all params except `success` and `error`. Page-size change sets `pageParam` to `1` and updates `pageSizeParam`.

- [ ] **Step 3: Implement controls**

Render `x-y dari total {itemLabel}`, dropdown `10/25/50`, and first/prev/next/last buttons using the same visual style as employee pagination.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/ui/data-pagination.tsx
git commit -m "feat: add reusable data pagination"
```

---

### Task 2: Employee Pagination Wrapper

**Files:**
- Modify: `src/app/dashboard/employees/_components/pagination-controls.tsx`

- [ ] **Step 1: Replace implementation with wrapper**

Import `DataPagination` and return it with `basePath="/dashboard/employees"`, `pageParam="page"`, `pageSizeParam="pageSize"`, and `itemLabel="pegawai"`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/app/dashboard/employees/_components/pagination-controls.tsx
git commit -m "refactor: reuse generic employee pagination"
```

---

### Task 3: Feedback Pagination Params and Slicing

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Replace fixed page size**

Remove `const PAGE_SIZE = 10`. Add helpers `positiveInt(value, fallback)`, `pageSizeValue(value)`, `pageCount(total, pageSize)`, `clampPage(page, total, pageSize)`, and `pageSlice(rows, page, pageSize)`.

- [ ] **Step 2: Parse page sizes**

Parse `monitorPageSize` and `identifiedPageSize` from query params. Both default to `10`; valid options are `10`, `25`, `50`.

- [ ] **Step 3: Slice independently**

Use `monitorPageSize` for monitoring rows and `identifiedPageSize` for identified rows. Clamp each page against its own filtered count and page size.

- [ ] **Step 4: Preserve page size in unit filters**

Update `UnitFilterForm` hidden fields so monitoring filter preserves `monitorPageSize`, and identified filter preserves `identifiedPageSize`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/dashboard/feedback/page.tsx
git commit -m "feat: add feedback page size params"
```

---

### Task 4: Feedback Table Pagination UI

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Import generic pagination**

Import `DataPagination` from `@/components/ui/data-pagination`.

- [ ] **Step 2: Flatten params**

Create `flatParams` in the server page by converting each `params` entry to a single string value and dropping empty values.

- [ ] **Step 3: Replace Monitoring footer**

Remove `TableMeta` and `PaginationLinks` usage for Monitoring Feedback. Render `DataPagination` with `basePath="/dashboard/feedback"`, `pageParam="monitorPage"`, `pageSizeParam="monitorPageSize"`, `page={monitorPage}`, `pageSize={monitorPageSize}`, `total={filteredMonitoring.length}`, `itemLabel="data monitoring"`, `searchParams={flatParams}`.

- [ ] **Step 4: Replace Feedback Teridentifikasi footer**

Remove `TableMeta` and `PaginationLinks` usage for Feedback Teridentifikasi. Render `DataPagination` with `pageParam="identifiedPage"`, `pageSizeParam="identifiedPageSize"`, `page={identifiedPage}`, `pageSize={identifiedPageSize}`, `total={filteredIdentified.length}`, `itemLabel="feedback"`.

- [ ] **Step 5: Remove old pagination helpers**

Delete `TableMeta`, `PaginationLinks`, `paginationWindow`, and `PaginationButton` from `feedback/page.tsx` after no callers remain.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/dashboard/feedback/page.tsx
git commit -m "feat: use data pagination on feedback tables"
```

---

### Task 5: Final Verification

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

Expected: completed Next build trace with no TypeScript or route errors.

- [ ] **Step 4: Manual smoke**

Verify in browser: Monitoring and Feedback Teridentifikasi default to 10, dropdown changes to 25/50, pagination preserves filters, unit filters reset only their table page to 1, Daftar Pegawai pagination still works.

- [ ] **Step 5: Commit fixes**

If verification edits files, run:

```bash
git status --short
git add src docs
git commit -m "fix: stabilize feedback table pagination"
```
