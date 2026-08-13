import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SLIDES_DIR = "src/app/kebersihan/_components/slides";

const tokens = readFileSync(`${SLIDES_DIR}/tokens.ts`, "utf8");

test("slide canvas is locked to the Instagram 4:5 size", () => {
  assert.match(tokens, /SLIDE_WIDTH = 1080/);
  assert.match(tokens, /SLIDE_HEIGHT = 1350/);
});

test("brand colours match the design source", () => {
  for (const hex of [
    "#0B4A2B",
    "#FDFCF8",
    "#C9A24B",
    "#E4C87F",
    "#B7212A",
    "#0B3A21",
  ]) {
    assert.ok(tokens.includes(hex), `token file missing ${hex}`);
  }
});

test("bunting alternates cream and red across 24 flags", () => {
  const bunting = readFileSync(`${SLIDES_DIR}/bunting.tsx`, "utf8");
  assert.match(tokens, /length: 24/);
  assert.match(bunting, /BUNTING_COLORS/);
  assert.match(bunting, /polygon\(0 0, 100% 0, 50% 100%\)/);
});

test("promo bar keeps the SPMB copy exactly as designed", () => {
  const promo = readFileSync(`${SLIDES_DIR}/promo-bar.tsx`, "utf8");
  assert.match(promo, /SPMB 2027\/2028 TELAH DIBUKA/);
  assert.match(promo, /nurussunnah\.sch\.id\/ppdb/);
});

test("header points at the self-hosted assets", () => {
  const header = readFileSync(`${SLIDES_DIR}/slide-header.tsx`, "utf8");
  assert.match(header, /\/kebersihan\/logo\.png/);
  assert.match(header, /\/kebersihan\/hut81\.webp/);
  assert.match(header, /Lomba Kebersihan Nurus Sunnah 2026/);
});
