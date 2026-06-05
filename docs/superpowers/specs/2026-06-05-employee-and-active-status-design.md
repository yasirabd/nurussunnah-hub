# Employee and Active Status Design

## Context

The employee directory currently stores employment state in `profiles.employee_status` and operational access state in `profiles.is_active`. The existing enum mixes employment category and lifecycle state: `TETAP`, `TIDAK_TETAP`, `KONTRAK`, `HONORER`, and `PENSIUN`. The UI also exposes `is_active` as a boolean checkbox, which cannot represent HR lifecycle states such as leave, resignation, dismissal, or retirement.

This design separates those concepts into two explicit fields:

- `employee_status`: employment category within the yayasan.
- `active_status`: current lifecycle or activity state.

## Goals

1. Replace the old employment enum with the approved employee categories: Magang, Honorer, Calon Pegawai Tetap Yayasan, and Pegawai Tetap Yayasan.
2. Replace `is_active` with a richer active status enum: Aktif, Cuti, Nonaktif, Resign, Diberhentikan, and Pensiun.
3. Preserve existing records through deterministic migration rules.
4. Update employee management UI and app logic so active employee checks use `active_status = 'AKTIF'`.
5. Keep lifecycle changes from accidentally changing the employee category.

## Non-Goals

- No hard deletion of employee, auth, role, unit assignment, feedback, or position records.
- No new HR history table in this scope.
- No workflow automation for approval of resignation, leave, dismissal, or retirement.
- No change to role names or permission model except references that currently depend on `is_active` or old employee status values.

## Data Model

`employee_status` will represent only employment category:

| Value | Label |
| --- | --- |
| `MAGANG` | Magang |
| `HONORER` | Honorer |
| `CPTY` | Calon Pegawai Tetap Yayasan |
| `PTY` | Pegawai Tetap Yayasan |

`active_status` will replace `is_active`:

| Value | Label |
| --- | --- |
| `AKTIF` | Aktif |
| `CUTI` | Cuti |
| `NONAKTIF` | Nonaktif |
| `RESIGN` | Resign |
| `DIBERHENTIKAN` | Diberhentikan |
| `PENSIUN` | Pensiun |

The default for new employees is `employee_status = 'CPTY'` and `active_status = 'AKTIF'`, unless the form explicitly chooses another value.

## Migration Rules

Existing `is_active` values map into `active_status` first:

| Existing value | New value |
| --- | --- |
| `is_active = true` | `active_status = 'AKTIF'` |
| `is_active = false` | `active_status = 'NONAKTIF'` |

Existing `employee_status` values map into the new employee category enum:

| Existing value | New employee status | Active status adjustment |
| --- | --- | --- |
| `TETAP` | `PTY` | unchanged from `is_active` mapping |
| `HONORER` | `HONORER` | unchanged from `is_active` mapping |
| `TIDAK_TETAP` | `CPTY` | unchanged from `is_active` mapping |
| `KONTRAK` | `CPTY` | unchanged from `is_active` mapping |
| `PENSIUN` | `PTY` | force `active_status = 'PENSIUN'` |

The migration should create replacement enum types, migrate data with explicit casts or temporary columns, then remove `profiles.is_active` after all application references have moved to `active_status`.

## Application Behavior

Employee create and edit forms show two separate dropdowns:

- `Status Pegawai`: Magang, Honorer, Calon Pegawai Tetap Yayasan, Pegawai Tetap Yayasan.
- `Status Aktif`: Aktif, Cuti, Nonaktif, Resign, Diberhentikan, Pensiun.

The employee table, profile page, dashboard summaries, and user context display both labels separately. The table status cell should show `active_status` as the primary badge and `employee_status` as the secondary category label.

The existing deactivate action becomes a lifecycle action that sets only `active_status = 'NONAKTIF'`. It must not overwrite `employee_status`.

Any app logic that currently means "pegawai aktif" must use `active_status = 'AKTIF'`. This includes feedback eligibility, feedback monitoring aggregates, dashboard counts, login NIY resolver filtering, and any directory filters or summaries that rely on active employees.

## TypeScript and Constants

Regenerated database types should expose both enums. Shared label maps should be centralized so form options, badges, profile views, and dashboard cards do not duplicate status text.

Expected labels:

```ts
const EMPLOYEE_STATUS_LABELS = {
  MAGANG: "Magang",
  HONORER: "Honorer",
  CPTY: "Calon Pegawai Tetap Yayasan",
  PTY: "Pegawai Tetap Yayasan",
};

const ACTIVE_STATUS_LABELS = {
  AKTIF: "Aktif",
  CUTI: "Cuti",
  NONAKTIF: "Nonaktif",
  RESIGN: "Resign",
  DIBERHENTIKAN: "Diberhentikan",
  PENSIUN: "Pensiun",
};
```

## Error Handling

Server actions should reject unknown status values before sending writes to Supabase. Database enum constraints remain the final guard. Migration should be written so existing rows always receive valid mapped values before old columns or enum types are removed.

## Testing and Verification

Verification should cover:

1. Migration applies cleanly to the current schema.
2. Existing records map according to the approved rules.
3. TypeScript compiles after replacing `is_active` references.
4. Employee create/edit persists both status fields.
5. Deactivation changes only `active_status` to `NONAKTIF`.
6. Feedback and dashboard active employee logic only includes `active_status = 'AKTIF'`.
7. Login by NIY keeps the intended lifecycle filtering after moving away from old `PENSIUN` checks.

## Open Decisions

No open product decisions remain for this scope. The approved mapping is explicit, including `TIDAK_TETAP` and `KONTRAK` to `CPTY`.
