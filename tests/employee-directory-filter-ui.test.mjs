import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const form = readFileSync(
  "src/app/dashboard/employees/_components/directory-filter-form.tsx",
  "utf8",
);

const page = readFileSync("src/app/dashboard/employees/page.tsx", "utf8");

function selectBlock(name) {
  const match = form.match(new RegExp(`<select\\s+name="${name}"[\\s\\S]*?</select>`));
  assert.ok(match, `expected a <select name="${name}"> in the filter form`);
  return match[0];
}

test("unit and status selects auto-apply on change", () => {
  assert.match(form, /^"use client";/);
  assert.match(selectBlock("unit"), /onChange=\{[\s\S]*?requestSubmit\(\)/);
  assert.match(selectBlock("active"), /onChange=\{[\s\S]*?requestSubmit\(\)/);
});

test("filter form preserves page reset and page size", () => {
  assert.match(form, /<input type="hidden" name="page" value="1" \/>/);
  assert.match(form, /<input type="hidden" name="pageSize" value=\{pageSize\} \/>/);
});

test("search input stays manual and Terapkan button remains", () => {
  const searchInput = form.match(/<Input\s+name="q"[\s\S]*?\/>/);
  assert.ok(searchInput, "expected a search <Input name=\"q\"> in the filter form");
  assert.equal(searchInput[0].includes("onChange"), false);
  assert.match(form, /<Button type="submit">Terapkan<\/Button>/);
});

test("employees page delegates the filter form to the client component", () => {
  assert.equal(page.includes("<form"), false);
  assert.match(page, /<DirectoryFilterForm/);
  assert.match(
    page,
    /import \{ DirectoryFilterForm \} from "\.\/_components\/directory-filter-form";/,
  );
});
