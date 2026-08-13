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

test("decorations expose the reusable ornament primitives", () => {
  const deco = readFileSync(`${SLIDES_DIR}/decorations.tsx`, "utf8");
  for (const name of ["Sparkle", "Bubble", "Broom", "SprayBottle", "Bucket"]) {
    assert.match(deco, new RegExp(`export function ${name}`), `missing ${name}`);
  }
  assert.match(
    deco,
    /polygon\(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%\)/
  );
});

test("the broom supports both the solid head and slide 3's bristles", () => {
  const deco = readFileSync(`${SLIDES_DIR}/decorations.tsx`, "utf8");
  assert.match(deco, /bristles/);
  assert.match(deco, /#F4E3B8/);
  assert.match(deco, /repeating-linear-gradient\(90deg, rgba\(140,95,30,0\.35\) 0 5px, transparent 5px 13px\)/);
});

test("the bucket keeps its handle arc and tapered body", () => {
  const deco = readFileSync(`${SLIDES_DIR}/decorations.tsx`, "utf8");
  assert.match(deco, /6px solid #801A1F/);
  assert.match(deco, /polygon\(4% 0, 96% 0, 84% 100%, 16% 100%\)/);
});

test("slide 1 renders a full-size canvas with the designed copy", () => {
  const hero = readFileSync(`${SLIDES_DIR}/slide-hero.tsx`, "utf8");
  assert.match(hero, /export function SlideHero/);
  assert.match(hero, /width: SLIDE_WIDTH/);
  assert.match(hero, /height: SLIDE_HEIGHT/);
  assert.match(hero, /BERSIH TEMPATNYA,/);
  assert.match(hero, /bangga menjaganya/);
  assert.match(hero, /LOMBA KEBERSIHAN NURUS SUNNAH 2026/);
  assert.match(hero, /HR\. Muslim no\. 328/);
  assert.match(hero, /@nurussunnah\.ig/);
  assert.match(hero, /FONT_ARABIC/);
  assert.match(hero, /height=\{58\}/);
  assert.match(hero, /slot="hero"/);
});

test("slide 1 keeps the rotated HUT-81 badge and logo plate", () => {
  const hero = readFileSync(`${SLIDES_DIR}/slide-hero.tsx`, "utf8");
  assert.match(hero, /rotate\(3deg\)/);
  assert.match(hero, /\/kebersihan\/hut81\.webp/);
  assert.match(hero, /\/kebersihan\/logo\.png/);
  assert.match(hero, /YAYASAN ISLAM/);
});

test("no slide file leaves a port placeholder behind", () => {
  const files = [
    "slide-hero.tsx",
    "slide-wide.tsx",
    "slide-detail.tsx",
    "slide-improvement.tsx",
  ];
  for (const file of files) {
    let source;
    try {
      source = readFileSync(`${SLIDES_DIR}/${file}`, "utf8");
    } catch {
      continue; // not ported yet
    }
    assert.doesNotMatch(
      source,
      /port from reference|\.\.\.\s*port|TODO|FIXME/i,
      `${file} still contains a port placeholder`
    );
  }
});
