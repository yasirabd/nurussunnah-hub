import assert from "node:assert/strict";
import test from "node:test";

function isFeedbackSubmissionOpenWIB(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return Number(value.month) === 6;
}

test("feedback submission window opens on 1 June 00:00 WIB", () => {
  assert.equal(
    isFeedbackSubmissionOpenWIB(new Date("2026-05-31T16:59:59.000Z")),
    false
  );
  assert.equal(
    isFeedbackSubmissionOpenWIB(new Date("2026-05-31T17:00:00.000Z")),
    true
  );
});

test("feedback submission window closes after 30 June 23:59 WIB", () => {
  assert.equal(
    isFeedbackSubmissionOpenWIB(new Date("2026-06-30T16:59:59.000Z")),
    true
  );
  assert.equal(
    isFeedbackSubmissionOpenWIB(new Date("2026-06-30T17:00:00.000Z")),
    false
  );
});
