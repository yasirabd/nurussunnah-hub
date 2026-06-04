# Academic Years UI/UX Redesign

Date: 2026-06-04
Status: Draft approved for implementation planning

## Goal

Make the `Tahun Pelajaran` page easier for HRD/Admin users to operate when creating, editing, and activating academic years. The page should prioritize the existing year list, reduce visual density, and add confirmation before changing the active academic year.

## Current State

The page at `/dashboard/academic-years` uses a two-column layout:

- Left card: permanent create form.
- Right card: editable table with inline inputs and action buttons.
- Activation happens immediately when the user submits the `Aktifkan` form.

This works functionally, but the page asks users to read and edit too many controls at once. The activation action is also important enough to deserve an explicit confirmation.

## Chosen Approach

Use a focused list-first page:

- Move create flow into a `Tambah Tahun` dialog.
- Move edit flow into an `Edit` dialog per row.
- Keep the main page focused on a compact academic-year list.
- Add a confirmation dialog before activating a different year.

No search, filter, or pagination will be added because the expected dataset is small.

## User Experience

### Header

The top area contains:

- Page title: `Tahun Pelajaran`.
- Short description of what the academic year affects.
- Active-year badge when one exists, e.g. `Aktif: 2026/2027`.
- Primary button: `Tambah Tahun` with a calendar-style icon.

Success and error messages remain near the header so users see action feedback immediately after redirects.

### Academic Year List

The main content is a single card/table section named `Daftar Tahun Pelajaran`.

Columns:

- `Tahun`: academic year name.
- `Periode`: formatted start and end dates.
- `Status`: `Aktif` or `Arsip` badge.
- `Aksi`: row actions.

The active row should have clearer emphasis than archive rows, using subtle styling only. The active row does not show `Aktifkan`.

Rows that are not active show:

- `Edit` button.
- `Aktifkan` button.

All rows show `Edit`. No delete action is included.

### Add Dialog

`Tambah Tahun` opens a dialog with:

- `Nama` text input, placeholder `2026/2027`.
- `Tanggal mulai` date input.
- `Tanggal selesai` date input.
- Checkbox `Jadikan tahun aktif`.
- Secondary button `Batal`.
- Primary submit button `Simpan Tahun`.

The form submits to the existing `createAcademicYearAction`. If the checkbox is selected, the current behavior remains: existing active years are deactivated before creating the new active year.

### Edit Dialog

Each row's `Edit` button opens a dialog with:

- `Nama` text input prefilled from the row.
- `Tanggal mulai` date input prefilled from the row.
- `Tanggal selesai` date input prefilled from the row.
- Secondary button `Batal`.
- Primary submit button `Simpan Perubahan`.

The form submits to the existing `updateAcademicYearAction` with the hidden academic-year id.

The edit dialog does not include active-status controls. Activation stays as its own explicit action.

### Activation Confirmation

Clicking `Aktifkan` opens a confirmation dialog before submitting.

The dialog must state:

- Which academic year will become active.
- The current active year will be replaced when one exists.
- Related workflows may use the newly active year after confirmation.

Actions:

- Secondary button `Batal`.
- Primary button `Aktifkan Tahun`.

The confirmation form submits to the existing `setActiveAcademicYearAction` with the academic-year id.

## Component Design

Keep the implementation scoped to the academic-year page unless extracting a tiny local helper improves readability.

Expected structure:

- Server page still loads auth, roles, and `academic_years` data.
- A client component handles dialog open/close state and row-level UI interactions.
- Existing UI primitives should be reused: `Button`, `Badge`, `Card`, `Dialog`, `Input`, `Label`, `Table`, and alert styling already present in the app.
- Use lucide icons for primary visual actions where useful.

The page should remain consistent with the existing dashboard style: restrained, work-focused, compact, and easy to scan.

## Data Flow

No database schema change is required.

Existing server actions remain the integration points:

- `createAcademicYearAction(formData)`.
- `updateAcademicYearAction(formData)`.
- `setActiveAcademicYearAction(formData)`.

Redirect-based success/error feedback remains unchanged. The page continues reading `success` and `error` search params.

## Error Handling

- Supabase query errors still render in the list area.
- Action errors still redirect back with `?error=...`.
- Empty state remains visible when no years exist.
- Required fields stay enforced in the browser via `required` inputs.

No new custom validation messages are in scope for this pass.

## Accessibility

- Dialog titles and descriptions must clearly identify the task.
- Buttons must use explicit labels, not icon-only controls.
- Activation must require a deliberate confirmation submit.
- Date fields retain native date input behavior.
- Table semantics should remain intact.

## Testing And Verification

Manual verification:

- Page renders for HRD/Admin.
- `Tambah Tahun` opens dialog and submits successfully.
- `Edit` opens a prefilled dialog and submits successfully.
- `Aktifkan` opens confirmation and only submits after confirmation.
- Active row no longer shows `Aktifkan`.
- Empty, error, success states still render.

Automated verification:

- Run TypeScript/build check available in this project.
- Run lint/build if feasible after implementation.

## Out Of Scope

- Search/filter/pagination.
- Delete/archive workflow changes.
- New academic-year validation rules beyond existing required fields.
- Database schema or RLS changes.
- Broader dashboard navigation redesign.
