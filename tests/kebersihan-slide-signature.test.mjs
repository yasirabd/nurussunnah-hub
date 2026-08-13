import assert from "node:assert/strict";
import test from "node:test";
import { slideSignature } from "../src/lib/kebersihan/slide-signature.mjs";

const photo = { src: "blob:a", zoom: 1, posX: 50, posY: 50 };

const base = {
  area: "Laboratorium Komputer",
  unit: "SMP Islam Nurus Sunnah",
  slots: {
    hero: photo,
    wide: photo,
    detail: photo,
    before: photo,
    after: photo,
  },
};

test("identical slide content produces an identical signature", () => {
  assert.equal(slideSignature(base), slideSignature({ ...base }));
});

test("renaming the area invalidates the exported slides", () => {
  // The area name is printed onto every slide, so exports made before the
  // rename no longer match the caption.
  assert.notEqual(
    slideSignature(base),
    slideSignature({ ...base, area: "Ruang Guru" })
  );
});

test("renaming the unit invalidates the exported slides", () => {
  assert.notEqual(
    slideSignature(base),
    slideSignature({ ...base, unit: "MA Nurus Sunnah" })
  );
});

test("nudging a crop invalidates the exported slides", () => {
  const zoomed = {
    ...base,
    slots: { ...base.slots, hero: { ...photo, zoom: 1.4 } },
  };
  const shifted = {
    ...base,
    slots: { ...base.slots, hero: { ...photo, posX: 20 } },
  };
  assert.notEqual(slideSignature(base), slideSignature(zoomed));
  assert.notEqual(slideSignature(base), slideSignature(shifted));
});

test("replacing a photo invalidates the exported slides", () => {
  assert.notEqual(
    slideSignature(base),
    slideSignature({
      ...base,
      slots: { ...base.slots, detail: { ...photo, src: "blob:b" } },
    })
  );
});

test("an empty slot is distinguishable from a filled one", () => {
  const { hero: _hero, ...withoutHero } = base.slots;
  assert.notEqual(
    slideSignature(base),
    slideSignature({ ...base, slots: withoutHero })
  );
});

test("editing member names does not invalidate the slides", () => {
  // Members appear only in the caption. Re-rendering four slides because a
  // name was corrected would be pure waste.
  assert.equal(
    slideSignature(base),
    slideSignature({ ...base, members: ["Ahmad", "Fulan"] })
  );
});
