import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveAttendanceTimeScope } from "../src/lib/attendance-correction.mjs";

test("deriveAttendanceTimeScope maps one selected time", () => {
  assert.equal(deriveAttendanceTimeScope(["MASUK"]), "MASUK");
  assert.equal(deriveAttendanceTimeScope(["PULANG"]), "PULANG");
});

test("deriveAttendanceTimeScope maps both selected times to KEDUANYA", () => {
  assert.equal(deriveAttendanceTimeScope(["MASUK", "PULANG"]), "KEDUANYA");
  assert.equal(deriveAttendanceTimeScope(["PULANG", "MASUK"]), "KEDUANYA");
});

test("deriveAttendanceTimeScope ignores duplicates and invalid values", () => {
  assert.equal(deriveAttendanceTimeScope(["MASUK", "MASUK"]), "MASUK");
  assert.equal(deriveAttendanceTimeScope(["BAD"]), "");
  assert.equal(deriveAttendanceTimeScope([]), "");
});

