import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const migrationPath = "supabase/migrations/042_remove_test_leave_request.sql";
const leaveRequestId = "5aeb4493-1c44-48f7-a81a-8bb855c58772";

test("cleanup migration deletes only the identified test leave request", () => {
  assert.ok(existsSync(migrationPath), "migration 042 must exist");

  const source = readFileSync(migrationPath, "utf8");
  const deleteStatements = source.match(/delete\s+from/gi) ?? [];

  assert.equal(deleteStatements.length, 1);
  assert.match(
    source,
    new RegExp(
      `delete\\s+from\\s+public\\.leave_requests\\s+where\\s+id\\s*=\\s*'${leaveRequestId}'::uuid\\s*;`,
      "i",
    ),
  );
});
