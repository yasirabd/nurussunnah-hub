import type { ActiveStatus, EmployeeStatus } from "@/types/database";

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "MAGANG", label: "Magang" },
  { value: "HONORER", label: "Honorer" },
  { value: "CPTY", label: "Calon Pegawai Tetap Yayasan" },
  { value: "PTY", label: "Pegawai Tetap Yayasan" },
] as const satisfies readonly { value: EmployeeStatus; label: string }[];

export const ACTIVE_STATUS_OPTIONS = [
  { value: "AKTIF", label: "Aktif" },
  { value: "CUTI", label: "Cuti" },
  { value: "NONAKTIF", label: "Nonaktif" },
  { value: "RESIGN", label: "Resign" },
  { value: "DIBERHENTIKAN", label: "Diberhentikan" },
  { value: "PENSIUN", label: "Pensiun" },
] as const satisfies readonly { value: ActiveStatus; label: string }[];

export const EMPLOYEE_STATUS_LABELS = Object.fromEntries(
  EMPLOYEE_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<EmployeeStatus, string>;

export const ACTIVE_STATUS_LABELS = Object.fromEntries(
  ACTIVE_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<ActiveStatus, string>;

export function isEmployeeStatus(value: string): value is EmployeeStatus {
  return EMPLOYEE_STATUS_OPTIONS.some((option) => option.value === value);
}

export function isActiveStatus(value: string): value is ActiveStatus {
  return ACTIVE_STATUS_OPTIONS.some((option) => option.value === value);
}

export function activeStatusBadgeVariant(status: ActiveStatus) {
  return status === "AKTIF" ? "default" : "secondary";
}
