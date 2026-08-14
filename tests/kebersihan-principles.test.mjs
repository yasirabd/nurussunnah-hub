import assert from "node:assert/strict";
import test from "node:test";
import { FIVE_R } from "../src/lib/kebersihan/principles.mjs";
import {
  SLOT_IDS,
  SLOT_PRINCIPLES,
} from "../src/lib/kebersihan/slot-sizes.mjs";

test("the five R are listed in their canonical order", () => {
  assert.deepEqual(
    FIVE_R.map((principle) => principle.name),
    ["Ringkas", "Rapi", "Resik", "Rawat", "Rajin"]
  );
});

test("each R explains itself in plain Indonesian", () => {
  for (const principle of FIVE_R) {
    assert.ok(
      principle.meaning.length > 20,
      `${principle.name} needs a real explanation`
    );
    assert.match(principle.meaning, /\.$/, `${principle.name} needs a full stop`);
  }
});

test("every photo slot declares which R it is judged on", () => {
  for (const id of SLOT_IDS) {
    assert.ok(id in SLOT_PRINCIPLES, `${id} missing from SLOT_PRINCIPLES`);
  }
  // The hero is the cover shot rather than evidence for one principle.
  assert.equal(SLOT_PRINCIPLES.hero, null);
});

test("the evidence slots between them cover all five R", () => {
  const named = SLOT_IDS.map((id) => SLOT_PRINCIPLES[id])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const principle of ["ringkas", "rapi", "resik", "rawat", "rajin"]) {
    assert.ok(named.includes(principle), `no slot is judged on ${principle}`);
  }
});
