# Employee Outsource Status Design

## Context

The application currently supports four employment categories in `employee_status_enum`: `MAGANG`, `HONORER`, `CPTY`, and `PTY`. HRD also needs to classify employees supplied through an outsourcing arrangement without changing how application access or employee lifecycle state works.

Employment category and operational state remain separate concepts. `employee_status` describes the employment arrangement, while `active_status` determines whether an employee can log in and participate in applicable modules.

## Goal

Add `OUTSOURCE` as a supported employee category across every existing status-entry and display path.

## Non-Goals

- Do not change role assignment or authorization rules.
- Do not change login eligibility, feedback eligibility, attendance, leave, or other module behavior.
- Do not migrate any existing employee into `OUTSOURCE` automatically.
- Do not change the default employee status from `CPTY`.
- Do not replace the enum with a configurable reference table.

## Data Model

Add `OUTSOURCE` to `public.employee_status_enum` through an additive Supabase migration. Existing enum values and stored records remain unchanged.

The complete employee category list becomes:

| Value | Label |
| --- | --- |
| `MAGANG` | Magang |
| `HONORER` | Honorer |
| `OUTSOURCE` | Outsource |
| `CPTY` | Calon Pegawai Tetap Yayasan |
| `PTY` | Pegawai Tetap Yayasan |

The UI presents the options in the order shown above. New employees still default to `CPTY` unless HRD/Admin explicitly selects another status.

## Application Behavior

The shared employee-status constants and generated database type must include `OUTSOURCE`. Components already using the shared option and label maps will then display `Outsource` consistently in employee forms, the directory, employee summaries, profiles, registration review, dashboards, and Excel exports.

`OUTSOURCE` must be accepted by all status-entry paths:

1. HRD/Admin employee creation and editing.
2. Employee registration submission and database RPC validation.
3. HRD/Admin registration review and approval.
4. Employee Excel import, accepting `OUTSOURCE` case-insensitively.

An outsource employee behaves exactly like another employee category. Login and module participation continue to depend on `active_status` and existing role or unit rules. No feature may infer reduced access merely from `employee_status = 'OUTSOURCE'`.

## Database Migration

Create a new migration after the current latest migration. It must:

1. Add `OUTSOURCE` to `public.employee_status_enum` without recreating the enum or rewriting existing profile data.
2. Replace the latest employee-registration submission RPC definition so its employee-status whitelist accepts `OUTSOURCE`.
3. Preserve the RPC's existing authentication, invite validation, field normalization, security-definer configuration, search path, and grants.

Historical migrations remain unchanged. The new migration represents the forward-only production change.

## Validation and Error Handling

Shared TypeScript validation accepts `OUTSOURCE` through the central employee-status options. Registration-review validation must explicitly accept it as a valid category while continuing to reject unknown values with the existing validation message.

The Excel importer maps normalized `OUTSOURCE` input to the enum value. Unknown or blank imported statuses retain the current fallback behavior of `CPTY`.

The database enum remains the final constraint against unsupported values. The registration RPC retains its defensive fallback to `CPTY` for invalid text input.

## Testing and Verification

Automated coverage must verify:

1. The shared option list includes `{ value: "OUTSOURCE", label: "Outsource" }` in the approved position.
2. Registration-review normalization accepts `OUTSOURCE` and still rejects an invalid value.
3. Excel import normalization recognizes `OUTSOURCE` case-insensitively and does not change the existing fallback.
4. Generated TypeScript database types include `OUTSOURCE` in `employee_status_enum`.
5. The new migration adds the enum value and updates the current registration RPC whitelist.
6. The existing test suite, TypeScript check, and production build pass.

## Success Criteria

HRD/Admin can select or import `Outsource`, registration approval can persist it, and every existing employee-status display renders the correct label. Existing employee records and all access behavior remain unchanged.
