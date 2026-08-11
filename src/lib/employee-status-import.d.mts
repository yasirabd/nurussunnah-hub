export type ImportedEmployeeStatus = "MAGANG" | "HONORER" | "OUTSOURCE" | "CPTY" | "PTY";

export function normalizeImportedEmployeeStatus(raw: unknown): ImportedEmployeeStatus;
