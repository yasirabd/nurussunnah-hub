import assert from "node:assert/strict";
import { test } from "node:test";

import {
  academicYearForDate,
  buildMagangNiy,
  nextMagangSequence,
  parseMagangNiy,
  validateManualMagangNiy,
} from "../src/lib/niy.mjs";

const years = [
  { id: "tp-2025", start_date: "2025-07-01", end_date: "2026-06-30" },
  { id: "tp-2026", start_date: "2026-07-01", end_date: "2027-06-30" },
];

test("academicYearForDate uses the academic-year start year", () => {
  assert.deepEqual(academicYearForDate("2026-08-01", years), {
    id: "tp-2026",
    startYear: 2026,
  });
});

test("academicYearForDate rejects missing and overlapping years", () => {
  assert.deepEqual(academicYearForDate("2024-01-01", years), {
    error: "Tanggal tidak termasuk Tahun Pelajaran mana pun.",
  });
  assert.deepEqual(
    academicYearForDate("2026-08-01", [
      ...years,
      { id: "overlap", start_date: "2026-08-01", end_date: "2026-12-31" },
    ]),
    { error: "Tanggal termasuk lebih dari satu Tahun Pelajaran." },
  );
});

test("Magang NIY formatting resets and follows stored manual numbers", () => {
  assert.equal(buildMagangNiy(2026, 1), "MAG-2026-001");
  assert.equal(nextMagangSequence(["MAG-2026-001", "MAG-2026-010", "MAG-2025-099"], 2026), 11);
  assert.equal(nextMagangSequence(["MAG-2026-010"], 2027), 1);
});

test("manual Magang NIY must match the effective academic year", () => {
  assert.deepEqual(parseMagangNiy(" mag-2026-010 "), {
    year: 2026,
    sequence: 10,
    niy: "MAG-2026-010",
  });
  assert.deepEqual(validateManualMagangNiy("MAG-2025-010", 2026), {
    error: "Tahun pada NIY Magang harus sesuai Tahun Pelajaran tanggal mulai.",
  });
  assert.deepEqual(validateManualMagangNiy("MAG-2026-000", 2026), {
    error: "NIY Magang harus mengikuti format MAG-YYYY-NNN dengan urutan 001-999.",
  });
});
