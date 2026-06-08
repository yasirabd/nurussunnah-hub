import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
const dashboardLayout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

test("middleware keeps dashboard requests cheap on Cloudflare", () => {
  assert.match(middleware, /auth\.getUser\(\)/);
  assert.doesNotMatch(middleware, /\.from\(["']profiles["']\)/);
  assert.doesNotMatch(middleware, /must_change_password/);
  assert.match(middleware, /x-pathname/);
});

test("dashboard layout owns profile-dependent password redirects", () => {
  assert.match(dashboardLayout, /context\.profile\?\.must_change_password/);
  assert.match(dashboardLayout, /headers\(\)/);
  assert.match(dashboardLayout, /\/dashboard\/change-password/);
});
