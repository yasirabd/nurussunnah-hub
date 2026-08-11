const EMPLOYEE_STATUS_MAP = {
  PTY: "PTY",
  HONORER: "HONORER",
  OUTSOURCE: "OUTSOURCE",
  MAGANG: "MAGANG",
  CPTY: "CPTY",
  "CALON PTY": "CPTY",
};

export function normalizeImportedEmployeeStatus(raw) {
  const key = String(raw ?? "").trim().toUpperCase();
  return EMPLOYEE_STATUS_MAP[key] ?? "CPTY";
}
