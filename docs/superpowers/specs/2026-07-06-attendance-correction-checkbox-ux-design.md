# Attendance Correction Checkbox UX Design

## Goal

Reduce duplicate attendance correction submissions when an employee forgot or did not bring their card and needs both check-in and check-out corrected.

## Current Problem

The form already supports `KEDUANYA`, but it is hidden as the third option in a native dropdown. Employees often submit two separate corrections: one for `Masuk` and one for `Pulang`.

## Design

Replace the `Waktu yang Perlu Dikoreksi` dropdown in the submit form with two checkboxes:

- `Masuk`
- `Pulang`

Add helper copy below the checkboxes:

`Jika tidak membawa kartu/lupa tap seharian, centang Masuk dan Pulang.`

The selected checkboxes map to the existing database enum:

- only `Masuk` checked -> `MASUK`
- only `Pulang` checked -> `PULANG`
- both checked -> `KEDUANYA`
- none checked -> user-facing validation error

Show time inputs based on the selected checkboxes:

- `Masuk` checked -> show required `Waktu Masuk`
- `Pulang` checked -> show required `Waktu Pulang`
- both checked -> show both required inputs

Rename the `Jenis Koreksi Presensi` label to `Penyebab presensi tidak tercatat`. Keep the existing options and required behavior because HR still needs this data for recap reporting.

## Data Flow

The browser submits checkbox values as form fields. The server action derives the existing `time_scope` enum before calling `submit_attendance_correction`.

No Supabase migration is needed. The existing RPC validation remains the final guard:

- `MASUK` and `KEDUANYA` require `requested_check_in`
- `PULANG` and `KEDUANYA` require `requested_check_out`

## Related Display Fix

Update `Koreksi Saya` history to show the same detailed time label used in validation, for example:

`Keduanya (Masuk 07:15, Pulang 16:05)`

This avoids making a combined correction look vague after submission.

## Out of Scope

- Changing enum values.
- Changing recap queries.
- Adding new correction categories.
- Adding duplicate-submission blocking rules.

## Verification

Run TypeScript/build verification after implementation. Manually check the form states:

- no checkbox selected
- only `Masuk`
- only `Pulang`
- both `Masuk` and `Pulang`

