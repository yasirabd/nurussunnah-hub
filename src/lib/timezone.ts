/** Timezone constants for Nurussunnah Hub (WIB / GMT+7) */
export const WIB = "Asia/Jakarta";

/** Today's date in WIB as YYYY-MM-DD (safe for DB date columns). */
export function todayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: WIB });
}

/** Format a date/time value in WIB locale. */
export function formatDateTimeWIB(value: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Format a date-only value in WIB locale (no time). */
export function formatDateWIB(value: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getWIBDateParts(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function isFeedbackSubmissionOpenWIB(value: Date = new Date()) {
  return getWIBDateParts(value).month === 6;
}

/**
 * Convert an Excel serial date number to a YYYY-MM-DD string.
 * Uses calendar arithmetic instead of UTC to avoid off-by-one errors.
 */
export function serialDateToISO(serial: number): string {
  // Excel serial date epoch is 1899-12-30
  const epoch = new Date(1899, 11, 30);
  epoch.setDate(epoch.getDate() + Math.floor(serial));
  const y = epoch.getFullYear();
  const m = String(epoch.getMonth() + 1).padStart(2, "0");
  const d = String(epoch.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
