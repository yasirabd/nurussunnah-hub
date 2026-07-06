import assert from "node:assert/strict";
import { test } from "node:test";

import { correctionRecapSheetNames, summarizeCorrectionDays } from "../src/lib/attendance-correction-recap.mjs";

test("summarizeCorrectionDays counts duplicate same-kind submissions once per day", () => {
  assert.deepEqual(
    summarizeCorrectionDays([
      { event_date: "2026-07-06", correction_kind: "LUPA_TAP" },
      { event_date: "2026-07-06", correction_kind: "LUPA_TAP" },
      { event_date: "2026-07-07", correction_kind: "LUPA_TAP" },
    ]),
    {
      total_correction_days: 2,
      lupa_tap_days: 2,
      kartu_tertinggal_days: 0,
      kartu_hilang_rusak_days: 0,
      kendala_sistem_days: 0,
    }
  );
});

test("summarizeCorrectionDays counts one total day when two kinds occur on one date", () => {
  assert.deepEqual(
    summarizeCorrectionDays([
      { event_date: "2026-07-06", correction_kind: "LUPA_TAP" },
      { event_date: "2026-07-06", correction_kind: "KENDALA_SISTEM" },
    ]),
    {
      total_correction_days: 1,
      lupa_tap_days: 1,
      kartu_tertinggal_days: 0,
      kartu_hilang_rusak_days: 0,
      kendala_sistem_days: 1,
    }
  );
});

test("correctionRecapSheetNames omits empty summary sheets for unit export", () => {
  assert.deepEqual(correctionRecapSheetNames(false), ["Ringkasan", "Per Pegawai"]);
});

test("correctionRecapSheetNames keeps all sheets for full recap export", () => {
  assert.deepEqual(correctionRecapSheetNames(true), ["Ringkasan", "Per Jenis", "Per Unit", "Per Pegawai"]);
});
