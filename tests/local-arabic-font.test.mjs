import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8");

test("Arabic typography uses self-hosted fonts during production builds", () => {
  assert.match(layout, /import localFont from "next\/font\/local"/);
  assert.doesNotMatch(layout, /Noto_Sans_Arabic/);

  for (const weight of [300, 400, 500]) {
    const relativePath = `./fonts/noto-sans-arabic-${weight}.ttf`;
    const filePath = `src/app/fonts/noto-sans-arabic-${weight}.ttf`;
    assert.ok(layout.includes(relativePath), `layout must load ${relativePath}`);
    assert.ok(existsSync(filePath), `${filePath} must exist`);
    assert.ok(statSync(filePath).size > 10_000, `${filePath} must contain a real font`);
  }

  assert.match(layout, /variable: "--font-arabic"/);
});
