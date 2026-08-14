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
  assert.match(header, /Lomba 5R Nurus Sunnah 2026/);
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
  assert.match(hero, /LOMBA 5R NURUS SUNNAH 2026/);
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

test("slide 2 and slide 3 keep their distinct framing and copy", () => {
  const wide = readFileSync(`${SLIDES_DIR}/slide-wide.tsx`, "utf8");
  const detail = readFileSync(`${SLIDES_DIR}/slide-detail.tsx`, "utf8");

  assert.match(wide, /export function SlideWide/);
  assert.match(wide, /CERDAS DALAM MENATA/);
  assert.match(wide, /300px 36px 36px 36px/);
  assert.match(wide, /rotate\(-1deg\)/);
  assert.match(wide, /slot="wide"/);

  assert.match(detail, /export function SlideDetail/);
  assert.match(detail, /RESIK SAMPAI SUDUT/);
  assert.match(detail, /36px 300px 36px 36px/);
  assert.match(detail, /rotate\(1deg\)/);
  assert.match(detail, /slot="detail"/);
  assert.match(detail, /head="bristles"/);

  for (const source of [wide, detail]) {
    assert.match(source, /SlideHeader/);
    assert.match(source, /Bunting/);
    assert.match(source, /PromoBar/);
    assert.match(source, /PAPER_BACKGROUND/);
    assert.match(source, /Bucket/);
    assert.match(source, /Broom/);
    assert.match(source, /SprayBottle/);
  }
});

test("slide 4 shows before and after with their pills", () => {
  const slide = readFileSync(`${SLIDES_DIR}/slide-improvement.tsx`, "utf8");
  assert.match(slide, /export function SlideImprovement/);
  assert.match(slide, /SEBELUM/);
  assert.match(slide, /SESUDAH/);
  assert.match(slide, /rotate\(-2deg\)/);
  assert.match(slide, /rotate\(1\.5deg\)/);
  assert.match(slide, /Kami menjaga,/);
  assert.match(slide, /bukan hanya membersihkan/);
  assert.match(slide, /zIndex=\{3\}/);
  assert.match(slide, /slot="before"/);
  assert.match(slide, /slot="after"/);
  assert.match(slide, /6px solid #C9A24B/);
});

test("every slide component is locked to 1080x1350", () => {
  const slides = {
    "slide-hero.tsx": "SlideHero",
    "slide-wide.tsx": "SlideWide",
    "slide-detail.tsx": "SlideDetail",
    "slide-improvement.tsx": "SlideImprovement",
  };
  for (const [file, name] of Object.entries(slides)) {
    const source = readFileSync(`${SLIDES_DIR}/${file}`, "utf8");
    assert.match(source, new RegExp(`export function ${name}`));
    assert.match(source, /width: SLIDE_WIDTH/);
    assert.match(source, /height: SLIDE_HEIGHT/);
    assert.match(source, /fontFamily: FONT_SANS/);
  }
});

test("the page never ships user photos anywhere", () => {
  const client = readFileSync(
    "src/app/kebersihan/_components/generator-client.tsx",
    "utf8"
  );
  assert.doesNotMatch(client, /\bfetch\(/);
  assert.doesNotMatch(client, /"use server"/);
  assert.match(client, /tidak diunggah ke server/);
});

test("generate stays disabled until all five photos are in", () => {
  const client = readFileSync(
    "src/app/kebersihan/_components/generator-client.tsx",
    "utf8"
  );
  assert.match(client, /SLOT_IDS\.every/);
  assert.match(client, /disabled=\{!ready \|\| busy\}/);
  // Sequential, never Promise.all: four 1080x1350 rasterizations in parallel
  // will exhaust memory on a mid-range phone.
  assert.doesNotMatch(client, /Promise\.all\([^)]*rasterize/);
  assert.match(client, /for \(const node of/);
});

test("the rasterized node carries no scale transform", () => {
  const stage = readFileSync(
    "src/app/kebersihan/_components/slide-stage.tsx",
    "utf8"
  );
  const transformIndex = stage.indexOf("transform:");
  const nodeRefIndex = stage.indexOf("ref={nodeRef}");

  assert.ok(transformIndex > 0, "preview must scale the slide somewhere");
  assert.ok(nodeRefIndex > 0, "stage must expose the slide node via nodeRef");

  // The scale has to live on a wrapper ABOVE the rasterized node. When it sits
  // on the node itself, modern-screenshot captures the shrunken render inside a
  // full 1080x1350 canvas and the remainder stays transparent — which JPEG,
  // having no alpha channel, flattens to black.
  assert.ok(
    transformIndex < nodeRefIndex,
    "scale must sit on the wrapper, above the node handed to the rasterizer"
  );
  assert.doesNotMatch(
    stage.slice(nodeRefIndex),
    /transform/,
    "the node handed to the rasterizer must not be transformed"
  );
});

test("the page loads the self-hosted carousel fonts", () => {
  const page = readFileSync("src/app/kebersihan/page.tsx", "utf8");
  assert.match(page, /kebersihanFontVariables/);
});

test("every one of the five R is named across the slides", () => {
  // The competition is judged on all five, so a carousel that only ever says
  // "resik" misrepresents what the area was assessed on.
  const combined = [
    "slide-hero.tsx",
    "slide-wide.tsx",
    "slide-detail.tsx",
    "slide-improvement.tsx",
  ]
    .map((file) => readFileSync(`${SLIDES_DIR}/${file}`, "utf8"))
    .join("\n")
    .toLowerCase();

  for (const principle of ["ringkas", "rapi", "resik", "rawat", "rajin"]) {
    assert.ok(combined.includes(principle), `no slide mentions ${principle}`);
  }
});

test("slides no longer call it a cleanliness contest", () => {
  const combined = [
    "slide-hero.tsx",
    "slide-wide.tsx",
    "slide-detail.tsx",
    "slide-improvement.tsx",
    "slide-header.tsx",
  ]
    .map((file) => readFileSync(`${SLIDES_DIR}/${file}`, "utf8"))
    .join("\n");
  assert.doesNotMatch(combined, /Lomba Kebersihan/i);
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
