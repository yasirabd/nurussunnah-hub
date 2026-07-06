export type CorrectionRecapInput = {
  event_date?: string | null;
  correction_kind?: string | null;
};

export type CorrectionDaySummary = {
  total_correction_days: number;
  lupa_tap_days: number;
  kartu_tertinggal_days: number;
  kartu_hilang_rusak_days: number;
  kendala_sistem_days: number;
};

export function summarizeCorrectionDays(rows: CorrectionRecapInput[]): CorrectionDaySummary;

