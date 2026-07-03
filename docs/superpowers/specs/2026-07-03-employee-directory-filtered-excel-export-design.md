# Employee Directory Filtered Excel Export Design

## Goal

Add an Excel download button on the employee directory for HRD, Admin, and Kepala Unit. The downloaded workbook contains all employees matching the active filters, not only the current paginated page.

## Access

HRD and Admin can export all employees visible to their role and current filters. Kepala Unit can export only employees inside their existing scoped unit access and current filters.

## Data Flow

`src/app/dashboard/employees/page.tsx` keeps the existing paginated query for table display. It adds a second profiles query for export without `.range(from, to)`, then applies the same search, unit, and active-status filters plus the same Kepala Unit scope. Roles for exported rows are fetched separately and grouped by user ID.

## UI

Add a focused client component, `DownloadEmployeesExcel`, using the existing `xlsx` and `lucide-react` pattern from other export components. Place the button in the `Daftar Pegawai` header area. Disable it when no exported rows exist.

## Workbook

The workbook has one sheet, `Pegawai`, with columns: Nama, NIY, Email, HP, Unit, Kode Unit, Status Aktif, Status Pegawai, Role.

## Testing

Add a static Node test that verifies:

- the employee page imports and renders `DownloadEmployeesExcel`;
- the page builds an export query without pagination;
- the export component uses `xlsx`, `Download`, the expected columns, and a disabled empty state.
