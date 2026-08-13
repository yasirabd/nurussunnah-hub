import assert from "node:assert/strict";
import test from "node:test";
import { UNIT_OPTIONS, UNIT_OTHER } from "../src/lib/kebersihan/units.mjs";
import { slideFileName } from "../src/lib/kebersihan/filenames.mjs";

test("unit list offers the free-text escape hatch last", () => {
  assert.equal(UNIT_OPTIONS.length, 10);
  assert.equal(UNIT_OPTIONS[0], "Yayasan");
  assert.equal(UNIT_OPTIONS.at(-1), UNIT_OTHER);
  assert.equal(new Set(UNIT_OPTIONS).size, UNIT_OPTIONS.length);
});

test("filename carries the slide number so carousel order survives", () => {
  const name = slideFileName({
    unit: "SMP Islam Nurus Sunnah",
    area: "Laboratorium Komputer",
    slide: 1,
  });
  assert.equal(
    name,
    "Kebersihan-2026_SMP-Islam-Nurus-Sunnah_Laboratorium-Komputer_Slide-1.jpg"
  );
});

test("filename sanitises punctuation and collapses separators", () => {
  const name = slideFileName({
    unit: "PPTQ / Pondok",
    area: "Ruang Guru (Lt. 2)",
    slide: 3,
  });
  assert.equal(name, "Kebersihan-2026_PPTQ-Pondok_Ruang-Guru-Lt-2_Slide-3.jpg");
});

test("filename truncates long segments to 32 characters", () => {
  const name = slideFileName({
    unit: "Yayasan",
    area: "Ruang Administrasi dan Pelayanan Umum Terpadu",
    slide: 4,
  });
  const areaSegment = name.split("_")[2];
  assert.ok(areaSegment.length <= 32, `too long: ${areaSegment}`);
  assert.equal(areaSegment, "Ruang-Administrasi-dan-Pelayanan");
});

test("filename never emits a leading or trailing dash", () => {
  const name = slideFileName({ unit: "  Yayasan  ", area: "!! Dapur !!", slide: 2 });
  assert.equal(name, "Kebersihan-2026_Yayasan_Dapur_Slide-2.jpg");
});
