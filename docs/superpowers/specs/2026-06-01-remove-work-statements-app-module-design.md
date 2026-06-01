# Remove Work Statements App Module Design

Date: 2026-06-01
Project: Nurussunnah Hub

## Context

The Surat Pernyataan Kerja feature is no longer needed in the application experience. The database schema, migrations, RPC functions, and historical deployment records should remain intact to avoid destructive migration risk and preserve reproducibility.

## Decision

Use option 2: remove the app module only.

## Goals

1. Remove Surat Kerja from navigation and dashboard entry points.
2. Remove work statement pages, actions, print route, and PDF upload UI from the app code.
3. Keep Supabase tables, RPCs, policies, migrations, and storage bucket definitions untouched.
4. Remove dashboard queries that only support the removed module.
5. Keep build, lint, and TypeScript checks passing.

## Non-Goals

- No destructive DB migration.
- No dropping `work_statements` or `statement_reviews`.
- No deleting historical Supabase migrations.
- No removing already-applied storage bucket migration from history.
- No redesign of unrelated feedback/profile/employee modules.

## App Changes

- Delete `src/app/dashboard/work-statements/page.tsx`.
- Delete `src/app/dashboard/work-statements/actions.ts`.
- Delete `src/app/dashboard/work-statements/[id]/print/page.tsx`.
- Delete `src/components/work-statements/print-button.tsx`.
- Remove Surat Kerja nav item from `src/components/layout/app-sidebar.tsx`.
- Remove Surat Pernyataan Kerja action card and related status prop from dashboard content.
- Remove `work_statements` query from `src/app/dashboard/page.tsx`.

## Docs

Update `docs/revision-log.md` with a note that the app module was removed intentionally while DB artifacts remain for migration safety.

## Verification

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`
- Smoke `/dashboard` and sidebar navigation to verify no links point to `/dashboard/work-statements`.

## Acceptance Criteria

- Users no longer see Surat Kerja in sidebar or dashboard.
- `/dashboard/work-statements` app route is gone.
- Dashboard no longer queries `work_statements`.
- Supabase database artifacts remain untouched.
- Verification commands pass.
