# Employee Directory Filtered Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a filtered Excel export button to the employee directory for HRD, Admin, and Kepala Unit.

**Architecture:** Keep the paginated table query unchanged. Add a separate non-paginated export query in `src/app/dashboard/employees/page.tsx`, reuse the existing filter and access scope, and pass flattened data to a new client-side `xlsx` component.

**Tech Stack:** Next.js App Router, Supabase JS query builder, React client component, `xlsx`, `node:test`.

---

### Task 1: Export Component And Page Wiring

**Files:**
- Create: `src/app/dashboard/employees/_components/download-employees-excel.tsx`
- Modify: `src/app/dashboard/employees/page.tsx`
- Test: `tests/employee-directory-export.test.mjs`

- [ ] **Step 1: Write failing static test**

Create `tests/employee-directory-export.test.mjs` checking imports, query naming, no pagination on export query, xlsx usage, expected columns, and disabled state.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/employee-directory-export.test.mjs`
Expected: FAIL because the component and page wiring do not exist yet.

- [ ] **Step 3: Add minimal implementation**

Create `DownloadEmployeesExcel` and add export query plus role grouping in `page.tsx`.

- [ ] **Step 4: Run targeted test**

Run: `node --test tests/employee-directory-export.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test`
Run: `npx tsc --noEmit`
Expected: both PASS.
