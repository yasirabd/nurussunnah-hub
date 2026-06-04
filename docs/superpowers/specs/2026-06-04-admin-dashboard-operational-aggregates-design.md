# Admin Dashboard Operational Aggregates Design

## Summary

Add a role-aware operational summary to the main dashboard for HRD and Kepala Unit. The section gives each role a compact view of employee and feedback signals that require action, without adding noise for ordinary employees.

## Goals

- Show useful aggregate information on `/dashboard` for HRD and Kepala Unit.
- Keep HRD global and Kepala Unit scoped to their unit responsibility.
- Reuse existing feedback and employee access patterns where possible.
- Keep the dashboard lightweight: KPI cards and a short attention list, not another large table.

## Non-Goals

- Do not expose the aggregate section to ordinary Pegawai users.
- Do not add detailed feedback identity data to the dashboard.
- Do not rebuild the feedback monitoring page inside the dashboard.
- Do not show low-value Kepala Unit metrics such as inactive employees or active unit count.

## Roles and Scope

HRD sees organization-wide aggregate data.

Kepala Unit sees scoped data only. The scope is the union of:

- `user_unit_assignments` rows for the current user with `assignment_type = 'HOME'`.
- The current user's `profiles.home_unit_id`, used as a fallback when assignment rows are incomplete.

Feedback monitoring uses `get_feedback_monitoring_scoped(activeYear.id)` so database-side scope and security stay consistent with the existing feedback page.

## Dashboard Content

Place a new `Ringkasan Operasional` section immediately after the existing hero panel.

For HRD, show KPI cards:

- Pegawai aktif.
- Pegawai nonaktif.
- Unit aktif.
- Progress feedback for the active academic year.
- Profil tanpa unit.

For Kepala Unit, show KPI cards:

- Pegawai aktif dalam cakupan.
- Progress feedback unit binaan for the active academic year.
- Pegawai belum selesai feedback.
- Feedback tertulis masuk, counted as completed feedback rows with non-empty notes where the receiver is in the Kepala Unit scope. This is count-only; no feedback text or giver identity is shown.

Below the KPI cards, show a compact `Perlu Perhatian` list:

- HRD: up to 3 units with the lowest feedback completion percentage, plus the number of employees still incomplete.
- Kepala Unit: up to 3 scoped units with the lowest feedback completion percentage when they cover more than one unit. If only one unit is in scope, show the incomplete employee count for that unit.

Add contextual CTAs:

- `Direktori Pegawai` for HRD and Kepala Unit.
- `Monitoring Feedback` for HRD and Kepala Unit.
- `Tahun Pelajaran` only for HRD/Admin when applicable.

## Data Flow

`src/app/dashboard/page.tsx` remains the server data loader.

It already fetches the current user, profile, roles, active academic year, and personal feedback count. Extend it to build an optional `operationalSummary` prop only when the user has `HRD` or `KEPALA_UNIT`.

For HRD:

- Count active profiles.
- Count inactive profiles.
- Count active units.
- Count active profiles with `home_unit_id` null.
- Use `get_feedback_monitoring_scoped` for feedback progress when an active year exists.

For Kepala Unit:

- Resolve scoped unit IDs from `user_unit_assignments` and `profiles.home_unit_id`.
- Count active profiles where `home_unit_id` is in scoped units.
- Use `get_feedback_monitoring_scoped` for feedback progress when an active year exists.
- Derive incomplete employee count and lowest-progress units from monitoring rows.
- Count written feedback for the active year with a server-side query against `peer_feedbacks`, joined through receiver profiles in the scoped units, filtered to `is_completed = true` and non-empty `feedback_text`. Return only the count.

The client dashboard component receives precomputed display-ready numbers and arrays. It should not contain Supabase calls or access-control logic.

## Components

Extend `DashboardContent` with an optional `operationalSummary` prop.

Add small local presentation helpers in `src/components/dashboard/dashboard-content.tsx`:

- `OperationalSummarySection` for the role-aware block.
- `OperationalMetricCard` for KPI cards.
- `AttentionList` for unit progress and incomplete feedback alerts.

Keep styling aligned with the existing dashboard: restrained cards, current radius variables, compact typography, lucide icons, and no large decorative panels.

## Empty and Error States

- If no active academic year exists, show employee metrics but mark feedback metrics as `Tahun pelajaran belum aktif`.
- If scoped Kepala Unit has no units, show a small warning state and link to the profile/directory context instead of showing zero-heavy metrics.
- If feedback monitoring returns no rows, show `Belum ada data monitoring feedback` in the attention list.
- Query errors should not break the whole dashboard; omit affected aggregate values and show a short unavailable helper text for that card.

## Security

- Do not use client-side filtering as an access boundary.
- Do not show the section to users without HRD or Kepala Unit roles.
- Keep HRD and Kepala Unit feedback data based on `get_feedback_monitoring_scoped`.
- Do not expose giver identity or raw feedback text in the dashboard aggregate.

## Testing

- Type-check the updated dashboard data shape.
- Build the app to catch server/client boundary issues.
- Verify dashboard rendering for:
  - HRD with active academic year.
  - Kepala Unit with one scoped unit.
  - Kepala Unit with multiple scoped units.
  - Pegawai-only user, where the aggregate section must be hidden.
  - No active academic year.
