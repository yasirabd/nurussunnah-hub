# Employee Directory Kepala Unit Scope Design

Date: 2026-06-01
Project: Nurussunnah Hub

## Context

The employee directory at `/dashboard/employees` is available to HRD, Admin, and Kepala Unit. HRD/Admin can currently manage employee operational data. Kepala Unit can open the directory, but management forms are hidden, unit filter options show all units, and active-status filtering is not role-aware in the UI. Existing RLS already lets Kepala Unit read profiles and current positions for employees in their unit scope, while writes to `position_histories` are limited to HRD/Admin.

## Goals

1. Limit Kepala Unit unit filter options to only units they are assigned to lead or belong to.
2. Prevent non-HRD/Admin users from filtering inactive employees.
3. Allow every user with the `KEPALA_UNIT` role to edit the active position name for employees in their own unit scope.
4. Keep HRD/Admin behavior unchanged.

## Non-Goals

- No redesign of the employee directory.
- No new position history workflow.
- No editing of position unit, start date, end date, or `is_current` by Kepala Unit.
- No broad employee profile edits for Kepala Unit.

## Recommended Approach

Use role-aware page filtering, a focused server action, and a database RLS update policy for defense in depth.

This is preferred over UI-only enforcement because position data is authorization-sensitive. The server action will validate the current user and target employee, while RLS prevents direct client updates outside the permitted row scope.

## Design

### Unit Filter Scope

HRD/Admin continue to see every unit in the unit filter.

Kepala Unit see only units resolved from their scope:

- `user_unit_assignments` rows for the current user with `assignment_type = 'HOME'`, and
- current user's `profiles.home_unit_id` as fallback when assignment data is incomplete.

If a Kepala Unit submits a URL query with a `unit` value outside this allowed set, the page ignores it. Directory rows remain constrained by existing profile RLS and by the normalized unit filter.

### Active Status Filter

HRD/Admin keep all active-status options: active, inactive, and all.

All other users, including Kepala Unit without HRD/Admin, are forced to `active`. If they submit `active=inactive` or `active=all` through the URL, the server component treats it as `active`. The inactive/all options are not rendered for them.

### Position Editing

The directory adds a small edit form for the active position name. HRD/Admin may continue editing employee data as before. Kepala Unit get only the position-name edit control for employees visible in their unit scope.

The edit updates only `position_histories.position_name` for the target employee's current row where `is_current = true`. It does not create a new history row and does not change `unit_id`, dates, or `is_current`.

If an employee has no current position row, the action returns a clear error instead of creating a new row. Creating current position rows remains HRD/Admin responsibility.

### Server Action

Add `updateEmployeeCurrentPositionAction` in `src/app/dashboard/employees/actions.ts`.

The action will:

1. Require an authenticated user.
2. Read current roles from `user_roles`.
3. Allow HRD/Admin for any target employee.
4. Allow Kepala Unit only when the target employee's `home_unit_id` is in the current user's allowed unit scope.
5. Normalize and validate `position_name` as non-empty text.
6. Update only the current position row for the target employee.
7. Revalidate `/dashboard/employees` and redirect with success/error feedback.

### RLS

Add a migration that creates a `position_histories` update policy for Kepala Unit.

Allowed update rows:

- current user has `KEPALA_UNIT`,
- target `position_histories.is_current = true`,
- `position_histories.user_id` belongs to a profile whose `home_unit_id` is in the current user's allowed unit scope.

The policy uses `WITH CHECK` with the same scope so a permitted row cannot be moved out of scope through the update. The server action only sends `position_name`, so other mutable columns are not exposed in the application path.

## Data Flow

1. Page loads current user, roles, and allowed units.
2. Page normalizes query params based on role.
3. Profile query applies search, unit, and active filters.
4. Position query loads current position rows for displayed employees.
5. Kepala Unit submits a position edit form for one visible employee.
6. Server action validates role and unit scope, updates the current position name, then refreshes the page.

## Error Handling

- Unauthenticated users redirect to login.
- Users without HRD/Admin/Kepala Unit redirect to dashboard.
- Out-of-scope unit filters are ignored for Kepala Unit.
- Out-of-scope position edits return an error message.
- Missing current position row returns a clear error message.
- Empty position names return validation error.

## Verification

Run local checks:

- `npx tsc --noEmit --incremental false`
- `npm run build`

Role smoke tests:

- Kepala SD sees only SD in the unit filter.
- Kepala SMP sees only SMP in the unit filter.
- Any other Kepala Unit sees only their own unit scope.
- Kepala Unit cannot request inactive/all status through URL.
- Kepala Unit can update the active position name for an employee in their unit.
- Kepala Unit cannot update an employee outside their unit.
- HRD/Admin can still filter all units and all active statuses.

## Acceptance Criteria

- Unit filter options are role-scoped for every Kepala Unit.
- Non-HRD/Admin users cannot view inactive employees through the active-status filter.
- Every Kepala Unit can edit active position names only for employees in their own unit scope.
- HRD/Admin behavior is unchanged.
- RLS protects direct updates to `position_histories` outside Kepala Unit scope.
- TypeScript and build checks pass.
