# Employee Directory Table CRUD Design

Date: 2026-06-01
Project: Nurussunnah Hub

## Context

`/dashboard/employees` currently mixes a directory table with a separate `Kelola Pegawai` section that renders full edit forms for every visible employee. This duplicates row content, makes scanning difficult, and turns routine HRD/Admin edits into a long page. The page already has focused server actions for profile updates, role updates, and active-position updates, so the redesign can improve UX without broad data-model changes.

## Goals

1. Replace the split `Daftar Pegawai` and `Kelola Pegawai` experience with one table-centered CRUD surface.
2. Keep HRD/Admin management fast while preserving Kepala Unit scoped access.
3. Keep existing server-side authorization and RLS behavior intact.
4. Avoid a large client-side data grid or new table framework for this iteration.

## Non-Goals

- No employee create/import flow in this batch.
- No database schema changes.
- No bulk edit or mass role assignment.
- No redesign outside `/dashboard/employees`.

## Recommended Approach

Use a table plus side drawer pattern. The table remains optimized for scanning employees. Row actions open a drawer for focused edits, with separate submit paths for profile, roles, and current position.

This is preferred over a dialog because the edit form has multiple groups and benefits from vertical space. It is preferred over inline editable cells because role, unit, status, and position changes need clearer boundaries and server-side validation feedback.

## Page Design

The page keeps the current server-rendered data loading model and existing role gates.

Header area:

- Title: `Direktori Pegawai`.
- Summary badge: visible employee count.
- Reset filter link when filters are active.

Filter toolbar:

- Search by name, NIY, or email.
- Unit filter.
- Active-status filter for HRD/Admin only.
- Submit button.

Table:

- Columns: Pegawai, Unit, Jabatan, Role, Kontak, Status, Aksi.
- Pegawai cell shows full name and NIY.
- Unit cell shows unit name and code.
- Jabatan and Role use compact badges/text.
- Kontak shows email and phone.
- Status shows active badge and employee status label.
- Aksi shows an edit icon/button when the current role can edit that row.

The current separate `Kelola Pegawai` card is removed.

## Drawer Design

Opening a row action reveals a side drawer with the selected employee context.

Drawer header:

- Employee name.
- NIY, home unit, and active status.

Drawer tabs:

- `Profil`: full name, NIY, email, phone, employee status, home unit, active checkbox. HRD/Admin only.
- `Role`: PEGAWAI, KEPALA_UNIT, HRD, ADMIN checkboxes. HRD/Admin only.
- `Jabatan`: active position name. HRD/Admin and Kepala Unit, subject to existing scoped server checks.

Each tab submits independently to the existing server action that owns that data. This keeps failures isolated: a role update cannot partially fail a profile update, and a position update remains available to Kepala Unit without exposing broader HRD/Admin controls.

## Access Control

- HRD/Admin can filter active/inactive/all and edit profile, role, and current position for visible employees.
- Kepala Unit can open the directory only for scoped active employees and can edit only current position where the existing server action permits it.
- Pegawai without HRD/Admin/Kepala Unit access continue to redirect to `/dashboard`.
- Server actions remain the source of truth for authorization.

## Error Handling

- Existing success/error query messages remain at the top of the page.
- Table error and empty states remain inside the table card.
- Drawer forms use normal submit buttons and rely on current redirect/revalidate behavior after save.

## Implementation Notes

- Introduce a focused client component for the interactive table/drawer shell, receiving already-loaded rows, roles, positions, units, and permission flags from the server page.
- Keep data fetching in the server page.
- Reuse existing shadcn/ui primitives: `Table`, `Drawer`, `Tabs`, `Button`, `Input`, `Badge`.
- Use lucide icons for row actions.
- Keep styling consistent with the current dashboard and avoid nested cards inside the drawer.

## Verification

Run after implementation:

- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`

Manual smoke checks:

- HRD/Admin can edit profile data from the drawer.
- HRD/Admin can update roles from the drawer.
- HRD/Admin can update current position from the drawer.
- Kepala Unit sees only scoped active rows and only position editing.
- Pegawai cannot access the directory.

## Acceptance Criteria

- `/dashboard/employees` no longer renders a separate repeated `Kelola Pegawai` form list.
- Employee CRUD for HRD/Admin is available from row actions in a drawer.
- Kepala Unit behavior remains scoped and limited.
- Existing server action authorization remains intact.
- Lint, TypeScript, and build pass.
