import assert from "node:assert/strict";
import test from "node:test";
import {
  SLOT_IDS,
  SLOT_LABELS,
  SLOT_SIZES,
} from "../src/lib/kebersihan/slot-sizes.mjs";
import { positionAxes } from "../src/lib/kebersihan/crop-axes.mjs";

test("there are five slots, each labelled for the participant", () => {
  assert.deepEqual(SLOT_IDS, ["hero", "wide", "detail", "before", "after"]);
  for (const id of SLOT_IDS) {
    assert.ok(SLOT_LABELS[id].length > 0, `${id} needs a label`);
    assert.ok(SLOT_SIZES[id].width > 0 && SLOT_SIZES[id].height > 0);
  }
});

test("slot sizes match the design source", () => {
  assert.deepEqual(SLOT_SIZES.hero, { width: 1080, height: 1350 });
  assert.deepEqual(SLOT_SIZES.wide, { width: 1008, height: 880 });
  assert.deepEqual(SLOT_SIZES.detail, { width: 1008, height: 880 });
  assert.deepEqual(SLOT_SIZES.before, { width: 620, height: 440 });
  assert.deepEqual(SLOT_SIZES.after, { width: 740, height: 450 });
});

test("a photo wider than its slot can only be panned horizontally", () => {
  // 4000x3000 (1.333) into hero 1080x1350 (0.8): cover crops the sides
  assert.deepEqual(positionAxes(4000, 3000, 1080, 1350, 1), { x: true, y: false });
});

test("a photo taller than its slot can only be panned vertically", () => {
  // 3000x4000 (0.75) into wide 1008x880 (1.145): cover crops top and bottom
  assert.deepEqual(positionAxes(3000, 4000, 1008, 880, 1), { x: false, y: true });
});

test("a photo matching its slot ratio needs no position slider", () => {
  assert.deepEqual(positionAxes(2160, 2700, 1080, 1350, 1), { x: false, y: false });
});

test("zooming in creates slack on both axes", () => {
  assert.deepEqual(positionAxes(2160, 2700, 1080, 1350, 1.4), { x: true, y: true });
});

test("degenerate input never reports slack", () => {
  assert.deepEqual(positionAxes(0, 0, 1080, 1350, 1), { x: false, y: false });
});
