# Attendance Correction Unit Day Recap Design

## Goal

Make `Rekap Koreksi Pegawai Unit` count corrected days, not raw correction submissions, and show each employee's correction-day breakdown by correction kind. Add Excel export for the unit recap.

## Current Problem

`unit_correction_counts_active_year()` counts correction rows. If an employee submits two corrections for the same date, the unit recap counts `2`, even though operationally it is one corrected day.

The `Unit Saya` recap also has no Excel export. HR/Admin `Rekap` has export, but its per-employee dataset uses the old row-count definition.

## Selected Approach

Add a new Supabase RPC and leave the existing RPC in place:

`unit_correction_day_recap_active_year()`

This avoids changing the behavior of existing callers that may still expect raw submission counts.

## RPC Contract

Return one row per active employee visible to the current user:

- `user_id uuid`
- `full_name text`
- `employee_no text`
- `unit_name text`
- `total_correction_days bigint`
- `lupa_tap_days bigint`
- `kartu_tertinggal_days bigint`
- `kartu_hilang_rusak_days bigint`
- `kendala_sistem_days bigint`

Inputs:

- `p_start_date date default null`
- `p_end_date date default null`

Date filters are optional:

- If both are empty, use all corrections in the active academic year.
- If `p_start_date` is set, include corrections on or after that date.
- If `p_end_date` is set, include corrections on or before that date.
- If both are set, include corrections between the two dates inclusively.

Access rules match the existing unit recap:

- HRD and Admin can see active employees.
- Kepala Unit can see active employees in their home-unit scope.

## Counting Rules

Use active academic year corrections only.

Apply the optional date filter before counting days.

Total days:

- Count distinct `(user_id, event_date)` via `COUNT(DISTINCT c.event_date)`.
- If the employee submits two corrections on the same date, total still counts `1`.

Per-kind days:

- Count distinct dates per correction kind.
- If the employee submits the same kind twice on the same date, that kind still counts `1`.
- If the employee submits different kinds on the same date, total still counts `1`, and each involved kind counts `1`.

Example:

- `2026-07-06`, `LUPA_TAP`, submitted twice -> total `1`, lupa tap `1`.
- `2026-07-06`, `LUPA_TAP` plus `KENDALA_SISTEM` -> total `1`, lupa tap `1`, kendala sistem `1`.

## UI Changes

### Unit Saya

Update `Rekap Koreksi Pegawai Unit`:

- Add `Tanggal Mulai` and `Tanggal Selesai` filters above the table.
- Filter submission reloads the same tab using query params:
  - `correctionStartDate`
  - `correctionEndDate`
- Date filters affect both the table and Excel export.
- Change `Jumlah Koreksi` label to `Hari Dikoreksi`.
- Add columns for:
  - `Lupa Tap`
  - `Kartu Tertinggal`
  - `Kartu Hilang/Rusak`
  - `Kendala Sistem`
- Add `Export Excel` button in the card header.
- Export exactly the same filtered rows and columns as the table, including all filtered rows, not only the current page.

### HR/Admin Rekap

Update `Koreksi per Pegawai (Aktif)` to use the same day-based RPC and the same per-kind columns.

Add the same optional date filters to the HR/Admin recap. Filters affect the per-employee table and the Excel export.

Update the existing Excel export so the `Per Pegawai` sheet exports:

- `Nama`
- `No. Pegawai`
- `Unit`
- `Hari Dikoreksi`
- `Lupa Tap`
- `Kartu Tertinggal`
- `Kartu Hilang/Rusak`
- `Kendala Sistem`

Existing sheets `Ringkasan`, `Per Jenis`, and `Per Unit` stay unchanged for now; they still describe raw correction submissions.

When date filters are active, include the filtered period in the Excel `Ringkasan` sheet:

- `Tanggal Mulai`
- `Tanggal Selesai`

## Out of Scope

- Changing existing raw-submission recap RPCs.
- Changing validation or submission behavior.
- Adding a detailed drilldown by date.
- Changing the meaning of summary cards outside per-employee/unit day recap.
- Filtering raw-submission `Per Jenis` and `Per Unit` sheets.

## Verification

Add a small pure JS self-check for day recap aggregation rules.

Run:

- focused aggregation self-check
- `npx tsc --noEmit`
- `npm run build`
