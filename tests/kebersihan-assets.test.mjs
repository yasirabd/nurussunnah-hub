import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const FONTS = [
  "src/app/fonts/plus-jakarta-sans-latin.woff2",
  "src/app/fonts/lora-italic-latin.woff2",
  "src/app/fonts/amiri-arabic-700.woff2",
];

test("carousel fonts are self-hosted and real", () => {
  for (const path of FONTS) {
    const size = statSync(path).size;
    assert.ok(size > 5_000, `${path} is only ${size} bytes`);
    const magic = readFileSync(path).subarray(0, 4).toString("latin1");
    assert.equal(magic, "wOF2", `${path} is not a woff2 file`);
  }
});

test("design assets are present", () => {
  assert.ok(statSync("public/kebersihan/logo.png").size > 10_000);
  assert.ok(statSync("public/kebersihan/hut81.webp").size > 10_000);
});

test("carousel fonts never come from next/font/google", () => {
  const fonts = readFileSync("src/app/kebersihan/kebersihan-fonts.ts", "utf8");
  assert.match(fonts, /next\/font\/local/);
  assert.doesNotMatch(fonts, /next\/font\/google/);
  for (const variable of ["--font-jakarta", "--font-lora", "--font-amiri"]) {
    assert.ok(fonts.includes(variable), `missing ${variable}`);
  }
});
