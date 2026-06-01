# Feedback Unit Scope Fix Design

## Context

Feedback rekan kerja should allow employees in the same unit to review each other. Example: SD principal can review SD teachers, and SD teachers can review the SD principal.

Current live data stores employee unit membership in `user_unit_assignments`, but `profiles.home_unit_id` is empty for active employees. Existing feedback RPCs use `profiles.home_unit_id` for target matching, so valid same-unit peers are not returned.

## Goals

- Same-unit feedback targets work from HOME assignments for the active academic year.
- `profiles.home_unit_id` is backfilled for existing employees from active HOME assignments.
- Future HRD/Admin profile unit edits keep `profiles.home_unit_id` and active HOME assignment aligned.
- Kepala Unit scoped monitoring works for their assigned unit.

## Non-Goals

- No change to feedback anonymity rules.
- No change to one-feedback-per-pair uniqueness.
- No new UI workflow for multi-unit teaching assignments.

## Approach

Use `user_unit_assignments` HOME records as the primary source for feedback unit scope. Keep `profiles.home_unit_id` as a compatibility/cache field and backfill it from assignment data.

## Data Flow

1. Feedback page loads active academic year.
2. `get_feedback_targets(active_year_id)` resolves giver units from HOME assignments for that year, falling back to `profiles.home_unit_id`.
3. Candidate receivers are resolved through their HOME assignment for the same year, falling back to `profiles.home_unit_id`.
4. `submit_peer_feedback` keeps using `get_feedback_targets` for authorization, so validation follows the same scope rule.
5. Monitoring uses the same effective unit logic for target counts and Kepala Unit visibility.

## Implementation Design

### Database Migration

- Backfill `profiles.home_unit_id` from active-year HOME assignments where `home_unit_id` is null.
- Replace `get_feedback_targets` to join giver and receiver effective units from `user_unit_assignments` first.
- Replace `get_feedback_monitoring_scoped` with the same effective unit CTEs.
- Keep grants/revokes equivalent to existing RPCs.

### Server Action Sync

- Update `updateEmployeeProfileAction` so changing `home_unit_id` also upserts the user's HOME assignment for the active academic year.
- If `home_unit_id` is cleared, delete the active-year HOME assignment for that user.

## Error Handling

- If no active academic year exists, profile update still updates `profiles.home_unit_id`; assignment sync is skipped.
- RPCs return empty target lists when the current user has no effective unit.
- Submit attempts outside effective scope continue to fail with the existing invalid-target error.

## Testing

- Query SD employees: SD001, SD002, SD003 should have effective unit SD.
- As SD001 context, `get_feedback_targets` should include SD002 and SD003.
- As SD002 context, `get_feedback_targets` should include SD001 and SD003.
- Monitoring scoped for Kepala SD should include SD employees.
- TypeScript build should pass.

