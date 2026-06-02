# Employee Directory Create, Edit, and Deactivate Design

Date: 2026-06-03
Project: Nurussunnah Hub

## Context

`/dashboard/employees` already uses a table plus drawer pattern for employee management. The current edit drawer only exposes a limited profile form, so HRD/Admin cannot see or update all profile fields from the directory. The table also lacks employee creation and deactivation controls. Login already supports email or NIY through `resolve_login_email`, so new employees should be created with a real Supabase Auth account and a matching profile record.

## Goals

1. Show all relevant employee fields in the directory edit experience.
2. Add HRD/Admin employee creation from the employee list.
3. Add employee deactivation from the employee list without hard-deleting historical data.
4. Let new employees log in immediately with email or NIY and default password `bismillahns`.
5. Force new employees to change the default password on first login.
6. Preserve existing Kepala Unit scoped behavior for position-only edits.

## Non-Goals

- No hard delete of employees, Auth users, roles, positions, feedback, or work history.
- No bulk import, bulk delete, or mass role assignment.
- No redesign outside the employee directory and the required first-login password-change flow.
- No change to the email-or-NIY login concept beyond first-login enforcement and inactive-user blocking.

## Recommended Approach

Use the existing table plus drawer model and extend it into a complete HRD/Admin CRUD surface. HRD/Admin get a `Tambah Pegawai` button, full edit tabs, and a guarded deactivate action. Kepala Unit keep the same scoped directory access and only see the current-position edit path.

This approach keeps scanning and editing in one page, avoids a separate employee creation route, and reuses the existing server action/RLS authorization model. It is preferred over inline table editing because the field set is too large for row-level editing and changes such as roles, unit assignment, Auth creation, and position history need clear submit boundaries.

## UI Design

Header and table card:

- Add a `Tambah Pegawai` button in the `Daftar Pegawai` card header for HRD/Admin only.
- Keep filters, metrics, and table columns as they are.
- Replace the single row edit action with compact icon buttons where permitted:
  - Edit opens the drawer.
  - Nonaktifkan opens a confirmation dialog for HRD/Admin only.
- Use clear accessible labels and tooltips for icon-only actions.

Drawer behavior:

- The drawer supports `create` and `edit` modes.
- Create mode opens empty form fields with sensible defaults: `PEGAWAI` role checked, active account checked, employee status `TETAP`, default gender `L`.
- Edit mode opens populated fields for the selected employee.
- Drawer content is scrollable with a sticky footer so long forms remain usable on mobile and desktop.
- Forms use one column on mobile and two columns on larger screens.

Drawer tabs:

- `Akun`: full name, NIY, email, phone, home unit, employee status, active account.
- `Data Pribadi`: gender, marital status, birth place, birth date, last education, study program.
- `Kontak`: phone, address KTP, address domicile, facebook, instagram, twitter.
- `Role`: PEGAWAI, KEPALA_UNIT, HRD, ADMIN checkboxes.
- `Jabatan`: current position name and unit-aware position creation/edit behavior.

Create mode can submit all tabs as one create form because a new employee needs a complete Auth, profile, role, unit, and optional position setup in one transaction-like workflow. Edit mode keeps separate submit buttons per tab where practical so failures remain scoped.

## Data and Auth Design

Create employee flow:

- HRD/Admin submits the create drawer.
- Server action validates HRD/Admin authorization.
- Server action creates a Supabase Auth user with:
  - email from the form,
  - password `bismillahns`,
  - email confirmed if supported by the current Supabase Admin API,
  - user metadata containing only non-authoritative display defaults such as full name, NIY, and gender.
- Server action upserts or updates `profiles` with all submitted profile fields.
- Server action sets `profiles.must_change_password = true` for the new user.
- Server action inserts selected roles, defaulting to `PEGAWAI` if none are selected.
- Server action synchronizes the `HOME` unit assignment for the active academic year.
- If a current position is provided, server action creates a current `position_histories` row.

First-login password change:

- Add `profiles.must_change_password boolean not null default false` as the app-side marker for users who must change password before normal use.
- New users start with this marker enabled.
- After successful login, middleware or the dashboard layout checks the marker and redirects to `/dashboard/change-password` until the user changes password.
- The change-password page updates the Auth password, then clears the marker through a server action.
- While the marker is enabled, all protected routes except logout and change-password redirect to the change-password page.

Deactivate employee flow:

- HRD/Admin clicks deactivate and confirms.
- Server action updates the profile instead of deleting records:
  - `is_active = false`,
  - `employee_status = 'PENSIUN'`.
- The action also disables or blocks login for the Auth user. If the current Supabase Admin API supports a disable/ban field, use it. Otherwise the application blocks inactive profiles immediately after login and signs them out with a clear message.
- Existing roles, positions, unit assignments, feedback, and history remain intact for audit and reporting.

Edit employee flow:

- HRD/Admin can edit all profile fields shown in the drawer.
- HRD/Admin can edit roles and current position.
- Kepala Unit can only edit current position for employees in their allowed unit scope, using the existing scoped server checks.
- Profile home unit edits continue to sync the active-year `HOME` assignment.

## Security and Permissions

- All create, full edit, role edit, and deactivate actions require HRD/Admin authorization server-side.
- Kepala Unit position edits remain server-validated by current user role and unit scope.
- Supabase service role credentials must be server-only and must not use `NEXT_PUBLIC_` names.
- Client UI permission checks are only for UX; server actions remain the authorization source of truth.
- Password-change enforcement must not rely on user-editable metadata for authorization decisions. Use `profiles.must_change_password`.
- Inactive profiles must not be allowed into protected app areas even if Auth sign-in succeeds.

## Error Handling

- Reuse top-of-page success/error query messages after server action redirects.
- Create action should report duplicate NIY, duplicate email, missing required fields, and Auth creation failures clearly.
- Deactivate confirmation should name the selected employee and explain that history is kept.
- Password-change page should reject passwords shorter than the existing reset-password minimum of 8 characters and should reject the default password.

## Implementation Notes

- Extend `EmployeeRow` and the page query to include all profile fields used by the drawer.
- Add `createEmployeeAction`, `deactivateEmployeeAction`, and a fuller profile update action in `src/app/dashboard/employees/actions.ts`.
- Add a server-only Supabase admin client helper if one does not already exist.
- Add the password-change route and guard using the `profiles.must_change_password` marker.
- Keep the drawer component focused; extract small field-section components if the file becomes hard to read.
- Use existing shadcn/ui primitives and lucide icons. Avoid nested cards inside the drawer.

## Verification

Run after implementation:

- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`

Manual smoke checks:

- HRD/Admin can create a new employee with email, NIY, default password, profile fields, roles, unit, and optional position.
- New employee can log in with email and with NIY using `bismillahns`.
- New employee is forced to change password before opening the dashboard.
- New employee cannot reuse `bismillahns` as the replacement password.
- After password change, normal dashboard access works and the marker is cleared.
- HRD/Admin edit drawer shows all profile fields and saves updates.
- HRD/Admin deactivation marks the employee inactive/pensioned and keeps history.
- Deactivated employees do not appear in the active filter and cannot access protected app areas.
- Kepala Unit still sees only scoped active employees and can only edit the current position.
- Non-manager employees still cannot access `/dashboard/employees`.

## Acceptance Criteria

- The employee directory edit drawer exposes all agreed profile, role, and position fields for HRD/Admin.
- HRD/Admin can add employees from the employee directory with Auth login enabled immediately.
- The default password for new employees is `bismillahns`.
- First login forces a password change before normal dashboard access.
- HRD/Admin can deactivate employees without deleting historical records.
- Existing Kepala Unit scoped position editing remains intact.
- Lint, TypeScript, and production build pass.
