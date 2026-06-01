# Feedback Identified Access Pagination Design

Date: 2026-06-01
Project: Nurussunnah Hub

## Context

The Feedback Rekan page has monitoring data for HRD/Admin/Kepala Unit and identified feedback data that shows giver identity. The existing page work already moves Feedback Teridentifikasi toward a table with pagination, but the section is still tied to the broader monitoring permission. Kepala Unit should keep scoped monitoring access, but they should not see or fetch Feedback Teridentifikasi because that view exposes giver identity.

## Goals

1. Keep Feedback Teridentifikasi as a table with clear pagination controls below it.
2. Show Feedback Teridentifikasi only to HRD/Admin.
3. Keep Monitoring Feedback visible to HRD/Admin/Kepala Unit.
4. Avoid fetching identified feedback data for Kepala Unit.

## Non-Goals

- No redesign of the full Feedback Rekan page.
- No changes to feedback submission behavior.
- No changes to anonymous Feedback Masuk behavior.
- No changes to Kepala Unit monitoring scope.

## Design

### Role Flags

Use separate role flags in `src/app/dashboard/feedback/page.tsx`:

- `canMonitor`: true for HRD, Admin, or Kepala Unit.
- `canViewIdentified`: true only for HRD or Admin.

This prevents the identified feedback view from inheriting Kepala Unit monitoring access.

### Data Fetching

The page continues to fetch monitoring data when `activeYear && canMonitor`.

The page fetches `get_feedback_identified` only when `activeYear && canViewIdentified`. For Kepala Unit, identified data is an empty array and the identified section is not rendered.

Before implementation, inspect the existing SQL/RPC definition for `get_feedback_identified`. If the function already restricts access to HRD/Admin, no database migration is needed. If it permits Kepala Unit or broader authenticated access to returned identified rows, add a migration that enforces HRD/Admin inside the function.

### UI

Monitoring Feedback remains under the `canMonitor` section.

Feedback Teridentifikasi is wrapped in `canViewIdentified`, not `canMonitor`.

The identified table includes these columns:

- Pemberi
- Penerima
- Rating
- Catatan
- Waktu

Below the table, show pagination controls:

- page summary: `Halaman x dari y`,
- previous button: `Sebelumnya`,
- bounded page number links,
- next button: `Berikutnya`.

The existing unit filter and reset link remain available for HRD/Admin only.

### URL Params

`identifiedUnit` and `identifiedPage` are meaningful only when `canViewIdentified` is true. If Kepala Unit opens `/dashboard/feedback?identifiedPage=2`, the page ignores those params because the section is not rendered and no identified data is fetched.

## Error Handling

- If there is no active academic year, the existing empty active-year state remains.
- If HRD/Admin has no identified feedback rows, show the existing empty table message.
- If Kepala Unit has monitoring rows but no identified access, no identified empty state is shown.

## Verification

Run local checks:

- `npx tsc --noEmit --incremental false`
- `npm run build`

Role smoke tests:

- HRD sees Feedback Teridentifikasi as a paginated table.
- Admin sees Feedback Teridentifikasi as a paginated table.
- Kepala Unit sees Monitoring Feedback but not Feedback Teridentifikasi.
- Kepala Unit URL params `identifiedUnit` and `identifiedPage` do not render or fetch identified feedback.

## Acceptance Criteria

- Feedback Teridentifikasi renders only for HRD/Admin.
- Feedback Teridentifikasi keeps table layout and pagination below the table.
- Kepala Unit cannot see the Feedback Teridentifikasi UI.
- Page code does not call `get_feedback_identified` for Kepala Unit.
- Monitoring Feedback remains available for Kepala Unit.
- TypeScript and build checks pass.
