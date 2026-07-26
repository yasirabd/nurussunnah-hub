# Attendance Correction Optional Note Design

## Goal

Make the attendance correction `Keterangan` field optional without requiring a database migration.

## Design

- Change the field label to `Keterangan (Opsional)`.
- Remove the HTML `required` constraint from the textarea.
- Add helper copy explaining that the field may be filled when additional context is needed.
- Keep the existing Server Action normalization, which sends an empty string when the field is omitted.
- Keep the `attendance_corrections.reason TEXT NOT NULL` database contract unchanged.

## Error Handling

An omitted note is submitted as an empty string, so the existing RPC and database constraint continue to accept the request. No schema deployment is required.

## Testing

Add regression coverage that confirms the correction form labels the field as optional and does not render it with `required`.

## Non-Goals

- Making `attendance_corrections.reason` nullable.
- Changing the leave-request reason requirement.
- Changing correction categories, times, or evidence upload behavior.
