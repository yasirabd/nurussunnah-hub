# Code Audit Repair Design

Date: 2026-06-01
Project: Nurussunnah Hub

## Context

This audit compares the current Next.js + Supabase app with `docs/prd.md` and the live Supabase project. Local checks are healthy enough to continue: lint passes with 8 existing warnings, TypeScript passes, and the build reaches the TypeScript phase. Live Supabase has the expected seed baseline: 12 profiles, 6 units, 1 academic year, 17 roles, 13 unit assignments, and 12 position histories. Workflow tables are still empty.

## Goals

1. Fix broken auth/navigation routes.
2. Complete basic profile self-edit.
3. Add HRD/Admin employee management beyond read-only directory.
4. Store approved work statement PDFs in Supabase Storage.
5. Add Kepala Unit scoped feedback monitoring and reminder visibility.
6. Review Supabase security/performance warnings without weakening access control.

## Non-Goals

- No visual redesign.
- No unrelated refactor of shared UI primitives.
- No destructive database changes.
- No index deletion based only on low seed/dev usage.

## Findings

- `/auth/forgot-password` redirects recovery links to `/auth/reset-password`, but that route is missing.
- Sidebar links Admin users to `/dashboard/settings`, but that route is missing.
- Profile page is read-only; PRD requires employees to update selected personal data.
- Employee directory lists and filters users, but does not manage users, roles, statuses, assignments, or imports.
- Work statement PDF is browser print only; `work_statements.pdf_url` is not populated and Storage is unused.
- Feedback monitoring is HRD/Admin only; Kepala Unit scoped monitoring is missing.
- Feedback reminders are not implemented.
- Supabase advisor still reports authenticated `SECURITY DEFINER` functions, leaked password protection disabled, and multiple permissive RLS policies.

## Recommended Approach

Use a blocker-first sequence:

1. Fix password reset.
2. Resolve settings navigation.
3. Add profile self-edit.
4. Add employee admin management.
5. Add PDF Storage output.
6. Add Kepala Unit feedback monitoring and reminders.
7. Harden Supabase RPC/RLS warnings.

## Design

### Password Reset

Add `/auth/reset-password` as a client page. It should accept the Supabase recovery session from the email link, validate password and confirmation, call `supabase.auth.updateUser({ password })`, show success/error state, then redirect after success. Middleware must allow this route to remain reachable during recovery instead of redirecting away before password entry.

### Settings Navigation

Implement `/dashboard/settings` as an Admin-only route. First version should be a real settings hub with security/account guidance and links to organization, unit, and academic year management. This is preferred over deleting the sidebar link because Admin navigation already includes settings.

### Profile Self-Edit

Add a whitelisted personal-data edit flow to the profile page. Editable fields: phone, address KTP, address domicile, facebook, instagram, twitter if present, and avatar URL if still text-based. Read-only fields: full name, NIY, roles, employee status, home unit, gender, birth data, and education unless edited through HRD/Admin flow. Server actions must re-check auth and update only `auth.uid()`.

### Employee Admin Management

Enhance `/dashboard/employees` for HRD/Admin while keeping Kepala Unit read-only/scoped. Add employee detail/edit flow for profile data, employee number normalization, email, active status, employee status, home unit, roles, unit assignments, and current position. Split writes into focused server actions instead of one broad mutation.

### Work Statement PDF Storage

Keep the print route as preview. Add a durable PDF persistence path that uploads approved statements to Supabase Storage and writes `work_statements.pdf_url`. Storage policies must mirror statement visibility: owner, authorized reviewer scope, HRD, and Admin.

### Feedback Monitoring

Add Kepala Unit monitoring scoped to assigned/home units. HRD/Admin keep full monitoring. Reminder v1 is limited to in-app dashboard and feedback-page visibility; email/cron reminders are out of scope for this repair batch.

### Supabase Hardening

Classify every public `SECURITY DEFINER` function. App RPCs may stay callable only if they enforce strict internal authorization. Helper functions should not be directly exposed where avoidable. Enable leaked password protection in Supabase Auth dashboard. Merge duplicate permissive RLS policies only after role smoke tests prove equivalent behavior.

## Verification

Each implementation batch must run:

- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`
- Route smoke tests for changed pages
- Supabase advisors after DB/RLS changes

Role smoke tests: Pegawai, Kepala Unit, HRD, and Admin.

## Acceptance Criteria

- No auth/sidebar link points to a missing route.
- Password reset works end to end.
- Employees can edit only approved personal fields.
- HRD/Admin can manage employee operational data.
- Approved statements have durable stored PDFs.
- Kepala Unit can monitor feedback progress for their scope only.
- Supabase warnings are reviewed and reduced where technically appropriate.
- Lint, TypeScript, and build pass after implementation batches.
