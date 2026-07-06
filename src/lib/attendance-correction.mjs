export function deriveAttendanceTimeScope(parts) {
  const values = new Set(parts.map(String));
  const hasIn = values.has("MASUK");
  const hasOut = values.has("PULANG");
  if (hasIn && hasOut) return "KEDUANYA";
  if (hasIn) return "MASUK";
  if (hasOut) return "PULANG";
  return "";
}

