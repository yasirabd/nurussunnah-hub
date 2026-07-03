import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  "src/app/dashboard/employees/employee-directory-table.tsx",
  "utf8",
);

test("employee directory hides Jabatan and sizes actions compactly", () => {
  assert.equal(source.includes("<TableHead>Jabatan</TableHead>"), false);
  assert.match(source, /<TableCell colSpan=\{7\}/);
  assert.match(source, /<TableHead>Jenis Kelamin<\/TableHead>/);
  assert.match(source, /<TableHead className="w-\[132px\] text-right">Aksi<\/TableHead>/);
  assert.match(source, /<TableCell className="max-w-\[220px\] whitespace-normal">/);
  assert.match(source, /<p className="break-words font-medium">/);
  assert.match(source, /<TableCell className="w-\[132px\]">/);
  assert.match(source, /className="flex items-center justify-end gap-1 whitespace-nowrap"/);
});
