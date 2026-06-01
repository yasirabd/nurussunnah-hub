# Code Audit Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix audited broken routes and incomplete PRD workflows.

**Architecture:** Keep Next.js App Router + Supabase SSR. Browser auth only in client pages; writes via server actions; DB/storage changes via migrations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase Auth/Postgres/Storage/RLS, shadcn/ui, Tailwind CSS.

---

## Files

- `src/app/auth/reset-password/page.tsx`, `src/lib/supabase/middleware.ts`
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/profile/actions.ts`, `src/app/dashboard/profile/page.tsx`, `src/components/profile/profile-view.tsx`
- `src/app/dashboard/employees/actions.ts`, `src/app/dashboard/employees/page.tsx`
- `src/app/dashboard/work-statements/actions.ts`, `src/app/dashboard/work-statements/page.tsx`
- `src/app/dashboard/feedback/page.tsx`, `src/types/database.ts`, `docs/revision-log.md`
- `supabase/migrations/010_work_statement_pdf_storage.sql`, `011_feedback_kepala_unit_monitoring.sql`, `012_rpc_security_hardening.sql`

## Tasks

### Task 1: Password Reset

- [ ] Create `/auth/reset-password` client page with `react-hook-form`, `zod`, `createClient()`, `supabase.auth.updateUser({ password })`, toast errors, success redirect to `/dashboard`.
- [ ] Validation: password min 8, confirmPassword min 8, refine equality, attach mismatch error to confirmPassword.
- [ ] Add `/auth/reset-password` to `authPassThroughRoutes` in `src/lib/supabase/middleware.ts`.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Commit `feat: add password reset route`.

### Task 2: Settings Route

- [ ] Create Admin-only `/dashboard/settings`: `getUser()`, redirect unauth to `/auth/login`, select `user_roles`, redirect non-Admin to `/dashboard`.
- [ ] Render cards linking Units, Academic Years, Employees; add security card for leaked-password protection + advisors.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Commit `feat: add admin settings hub`.

### Task 3: Profile Self-Edit

- [ ] Create `updateMyProfileAction`; whitelist only `phone`, `address_ktp`, `address_domicile`, `facebook`, `twitter`, `instagram`, `avatar_url`; update only the row where column id equals `user.id`.
- [ ] Parse `success`/`error` in profile page; pass messages to `ProfileView`.
- [ ] Add form card in `ProfileView`; keep name, NIY, roles, status, unit, gender, birth data, education read-only.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Commit `feat: add profile self edit`.

### Task 4: Employee Admin Editing

- [ ] Create `ensureCanManageEmployees()` for HRD/Admin only.
- [ ] Add `updateEmployeeProfileAction`: update full name, normalized employee_no, email, phone, status, active flag, home unit.
- [ ] Add `updateEmployeeRolesAction`: replace roles from PEGAWAI/KEPALA_UNIT/HRD/ADMIN checkboxes.
- [ ] Add HRD/Admin inline edit controls in employees page; Kepala Unit stays read-only/scoped.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Commit `feat: add employee admin editing`.

### Task 5: PDF Storage

- [ ] Migration `010`: private bucket `work-statement-pdfs`; owner read/write; HRD/Admin read.
- [ ] Add `uploadWorkStatementPdfAction`: require auth, PDF MIME, own APPROVED statement, upload `${user.id}/${statementId}.pdf`, update `work_statements.pdf_url`.
- [ ] Add upload form next to approved print link.
- [ ] Apply migration; regenerate `src/types/database.ts`.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Commit `feat: store work statement pdfs`.

### Task 6: Scoped Feedback Monitoring

- [ ] Migration `011`: RPC `get_feedback_monitoring_scoped(uuid)` with same result columns as current monitoring; HRD/Admin all rows; Kepala Unit home-unit rows; no giver identity.
- [ ] Revoke RPC from public; grant authenticated.
- [ ] Feedback page: `canMonitor` includes Kepala Unit; call scoped RPC; identified feedback remains HRD/Admin only.
- [ ] Add in-app reminder card listing incomplete monitoring rows.
- [ ] Apply migration; regenerate `src/types/database.ts`.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Commit `feat: add scoped feedback monitoring`.

### Task 7: Supabase Hardening

- [ ] Run security/performance advisors; record start warnings.
- [ ] Migration `012`: revoke authenticated execute from helper RPCs `is_admin()`, `is_hrd()`, `is_kepala_unit()`, `get_my_roles()`, `can_review_work_statement(uuid)`; leave app-facing RPCs callable with internal checks.
- [ ] Apply migration; rerun advisors; document remaining accepted warnings.
- [ ] Update revision log; mention leaked-password protection is dashboard-level.
- [ ] Commit `chore: harden supabase rpc exposure`.

### Task 8: Final Verification

- [ ] Run `npm run lint`; expect exit 0.
- [ ] Run `npx tsc --noEmit --incremental false`; expect exit 0.
- [ ] Run `npm run build`; expect successful build.
- [ ] Run Supabase advisors; expect no new high/error findings.
- [ ] Smoke routes: forgot/reset password, settings, profile, employees, work statements, feedback.
- [ ] Commit verification docs if changed.

## Self-Review

- Coverage: all approved findings map to Tasks 1-7; Task 8 verifies.
- Red-flag scan: email/cron reminders excluded from this batch by spec.
- Types: planned fields match `database.ts`: `address_ktp`, `address_domicile`, `twitter`, `pdf_url`.
