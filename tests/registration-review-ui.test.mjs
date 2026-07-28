import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const reviewSource = readFileSync(
  "src/app/dashboard/employees/registrations/_components/registration-review.tsx",
  "utf8",
);
const pageSource = readFileSync(
  "src/app/dashboard/employees/registrations/page.tsx",
  "utf8",
);

test("registration review edits fields and title-cases full name", () => {
  assert.match(reviewSource, /toTitleCaseName/);
  assert.match(reviewSource, /useState\(reg\.full_name\)/);
  assert.match(reviewSource, /name="full_name"/);
  assert.match(reviewSource, /onBlur=.*toTitleCaseName/s);
  assert.match(reviewSource, /name="nik"/);
  assert.match(reviewSource, /name="home_unit_id"/);
  assert.match(reviewSource, /name="position_name"/);
  assert.match(reviewSource, /name="emergency_name"/);
  assert.match(reviewSource, /name="note"/);
  assert.doesNotMatch(reviewSource, /name="email"/);
  assert.match(reviewSource, /reg\.email/);
  assert.match(reviewSource, /DocButton/);
});

test("registrations page supplies active unit choices", () => {
  assert.match(pageSource, /\.from\("units"\)/);
  assert.match(pageSource, /\.eq\("is_active", true\)/);
  assert.match(pageSource, /home_unit_id: r\.home_unit_id/);
  assert.match(pageSource, /<RegistrationReview reg=\{detail\} units=\{/);
});
