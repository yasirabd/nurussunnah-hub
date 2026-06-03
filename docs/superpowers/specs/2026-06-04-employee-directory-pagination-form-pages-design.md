# Employee Directory Pagination and Form Pages Design

Date: 2026-06-04
Project: Nurussunnah Hub

## Context

`/dashboard/employees` currently loads all matching profiles into a single table and opens a right drawer for create/edit. This makes the table less suitable for larger employee counts and gives the long profile form too little space. The deactivate action currently uses a trash icon, which suggests deletion even though the action only marks the employee inactive/pensioned.

## Goals

1. Make the employee list behave like a standard paginated data table.
2. Move employee create and edit flows from the drawer to full pages with more form space.
3. Replace the deactivate trash icon with `UserX` to communicate account/person deactivation.
4. Improve field grouping, labels, spacing, and helper text so HRD/Admin can fill forms more easily.
5. Preserve existing HRD/Admin and Kepala Unit permissions.

## Non-Goals

- No database schema changes.
- No new table library or client-side data grid package.
- No bulk employee actions.
- No import/export workflow.
- No redesign outside the employee directory and its create/edit pages.

## Recommended Approach

Use server-side pagination on `/dashboard/employees` and dedicated App Router pages for employee forms:

- List: `/dashboard/employees`
- Create: `/dashboard/employees/new`
- Edit: `/dashboard/employees/[id]/edit`

This is preferred over client-side pagination because it scales with larger employee counts and avoids loading all profile rows. It is preferred over keeping the drawer because the field set is now too large for a constrained side panel.

## List Page Design

The list page remains server-rendered and keeps the current filters.

URL parameters:

- `q`: search by full name, NIY, or email.
- `unit`: selected unit ID.
- `active`: `active`, `inactive`, or `all` for HRD/Admin; forced to `active` for non-HRD/Admin.
- `page`: current page, default `1`.
- `pageSize`: page size, default `10`.

Pagination behavior:

- Page size dropdown options: `10`, `25`, `50`.
- Filter changes reset `page` to `1`.
- Query uses Supabase `select(..., { count: "exact" })` and `.range(from, to)`.
- Page bounds are normalized so invalid or empty page values do not break rendering.
- Footer shows `x-y dari total pegawai` and navigation controls.
- Controls include first, previous, next, and last buttons plus compact current-page text.

Table behavior:

- Table columns remain: Pegawai, Unit, Jabatan, Role, Kontak, Status, Aksi.
- `Tambah Pegawai` appears above the table for HRD/Admin and links to `/dashboard/employees/new`.
- Edit action uses the pencil icon and links to `/dashboard/employees/[id]/edit`.
- Deactivate action uses `UserX`, not a trash icon.
- Kepala Unit keeps only the edit path needed for scoped current-position edits.

Data loading:

- Fetch profiles only for the current page.
- Fetch `user_roles` and current `position_histories` only for IDs in the current page.
- Metrics on the page should reflect the current filtered dataset clearly. If a metric only describes the current page, label it that way. Avoid implying global totals when only page rows are counted.

## Create Page Design

Route: `/dashboard/employees/new`

Access:

- HRD/Admin only.
- Other roles redirect to `/dashboard`.

Layout:

- Header includes title `Tambah Pegawai` and a back link to `/dashboard/employees`.
- Intro copy explains the default password `bismillahns` and first-login password change.
- Full-page form with sections:
  - `Akun & Kepegawaian`: full name, NIY, email, phone, home unit, employee status, active account.
  - `Data Pribadi`: gender, marital status, birth place, birth date, last education, study program.
  - `Kontak & Alamat`: address KTP, address domicile, facebook, instagram, twitter.
  - `Role Awal`: PEGAWAI, KEPALA_UNIT, HRD, ADMIN.
  - `Jabatan Awal`: current position name.
- Desktop uses a two-column grid where fields are short. Long address fields span full width.
- Mobile uses one column.
- Submit controls are easy to reach at the bottom, with a secondary cancel/back action.

Data behavior:

- Submit calls `createEmployeeAction`.
- Success redirects to `/dashboard/employees` with a success message.
- Failure should redirect back to `/dashboard/employees/new` with an error message, keeping the user in the create context.

## Edit Page Design

Route: `/dashboard/employees/[id]/edit`

Access:

- HRD/Admin can edit profile, roles, and current position.
- Kepala Unit can edit only current position for employees in their permitted unit scope, using existing server checks.
- Unauthorized users redirect to `/dashboard`.

Layout:

- Header includes a back link to `/dashboard/employees`.
- Edit page shows a compact employee summary: full name, NIY, unit, active status, employee status, roles.
- HRD/Admin see form sections:
  - `Akun & Kepegawaian`
  - `Data Pribadi`
  - `Kontak & Alamat`
  - `Role`
  - `Jabatan`
- Kepala Unit sees only `Jabatan`.

Form behavior:

- Profile fields submit through `updateEmployeeProfileAction`.
- Roles submit through `updateEmployeeRolesAction`.
- Current position submits through `updateEmployeeCurrentPositionAction`.
- Each submit returns to the edit page on error and stays on the edit page after success with a success message, so HRD/Admin can continue editing another section.
- Actions accept a `return_to` hidden field so the same server actions redirect to the form page instead of always returning to the list.

## Field UX

Field components should be extracted or shared between create/edit pages to keep labels and layout consistent.

Rules:

- Labels are always visible, not placeholder-only.
- Required fields are marked through `required` and clear label text.
- Helper text is used for NIY normalization, default password, active status, and first-login password changes.
- Select fields have clear default empty labels such as `Pilih unit`.
- Checkbox controls use stable row height and clear text.
- Address textareas span full width and have enough height.
- Buttons use icons only where the symbol is familiar; icon-only buttons must have `aria-label` and `sr-only` text.

## Error Handling

- List page keeps top-level success/error messages.
- Create page shows errors near the top of the form.
- Edit page shows top-level success/error messages above the form sections.
- Deactivate confirmation names the employee and explains that history is kept.
- Empty table state explains when no rows match filters and offers reset filter when relevant.

## Implementation Notes

- Refactor `EmployeeDirectoryTable` into a table-only client component. It should not own drawer state anymore.
- Add reusable employee form components under `src/app/dashboard/employees/_components/`.
- Keep data fetching in server pages.
- Keep existing server actions and extend redirects with `return_to` support instead of duplicating action logic.
- Use lucide `UserX` for deactivate.
- Do not introduce a new data-grid dependency.

## Verification

Run after implementation:

- `npx tsc --noEmit --incremental false`
- `npx eslint src --max-warnings=0`
- `npm run build`

Manual smoke checks:

- HRD/Admin sees paginated table, default 10 rows.
- Page size dropdown changes between 10, 25, and 50.
- Filters reset to page 1.
- Pagination controls navigate correctly and preserve filters.
- Add button opens `/dashboard/employees/new`.
- Create form has enough spacing and creates a login-capable user.
- Edit button opens `/dashboard/employees/[id]/edit`.
- Edit page loads all expected fields.
- Role and position forms still work.
- Deactivate uses `UserX` and soft-disables the employee.
- Kepala Unit can still access only scoped position editing.

## Acceptance Criteria

- Employee list uses server-side pagination with default 10 rows and page-size dropdown.
- Create and edit no longer use the drawer.
- Create and edit use full pages with clearer field grouping and spacing.
- Deactivate action uses `UserX`, not a trash/delete icon.
- Existing authorization rules remain intact.
- TypeScript, scoped ESLint, and build pass.
