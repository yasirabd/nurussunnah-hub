const KIND_KEYS = {
  LUPA_TAP: "lupa_tap_days",
  KARTU_TERTINGGAL: "kartu_tertinggal_days",
  KARTU_HILANG_RUSAK: "kartu_hilang_rusak_days",
  KENDALA_SISTEM: "kendala_sistem_days",
};

export function summarizeCorrectionDays(rows) {
  const totalDates = new Set();
  const byKind = Object.fromEntries(Object.values(KIND_KEYS).map((key) => [key, new Set()]));

  for (const row of rows) {
    if (!row?.event_date) continue;
    totalDates.add(row.event_date);
    const key = KIND_KEYS[row.correction_kind];
    if (key) byKind[key].add(row.event_date);
  }

  return {
    total_correction_days: totalDates.size,
    lupa_tap_days: byKind.lupa_tap_days.size,
    kartu_tertinggal_days: byKind.kartu_tertinggal_days.size,
    kartu_hilang_rusak_days: byKind.kartu_hilang_rusak_days.size,
    kendala_sistem_days: byKind.kendala_sistem_days.size,
  };
}

