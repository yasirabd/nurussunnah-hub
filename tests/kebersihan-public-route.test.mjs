import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUTH_PASS_THROUGH_ROUTES,
  isPublicRoute,
} from "../src/lib/auth/public-routes.mjs";

test("kebersihan generator is reachable without a session", () => {
  assert.equal(isPublicRoute("/kebersihan"), true);
  assert.equal(isPublicRoute("/kebersihan/apa-pun"), true);
});

test("existing public routes keep working", () => {
  assert.equal(isPublicRoute("/auth/login"), true);
  assert.equal(isPublicRoute("/auth/forgot-password"), true);
  assert.equal(isPublicRoute("/register"), true);
  for (const route of AUTH_PASS_THROUGH_ROUTES) {
    assert.equal(isPublicRoute(route), true, `${route} must stay public`);
  }
});

test("dashboard stays behind the session gate", () => {
  assert.equal(isPublicRoute("/dashboard"), false);
  assert.equal(isPublicRoute("/dashboard/employees"), false);
  assert.equal(isPublicRoute("/"), false);
});

test("prefix match does not leak to lookalike paths", () => {
  assert.equal(isPublicRoute("/kebersihanx"), false);
  assert.equal(isPublicRoute("/registerx"), false);
});

test("middleware delegates the decision to the pure module", () => {
  const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
  assert.match(
    middleware,
    /import \{[^}]*isPublicRoute[^}]*\} from '@\/lib\/auth\/public-routes\.mjs'/
  );
  // Must be CALLED with the path. `!isPublicRoute` on a function is always
  // false, which would silently open every dashboard route to the public.
  assert.match(middleware, /!isPublicRoute\(url\.pathname\)/);
  assert.doesNotMatch(middleware, /const isPublicRoute =/);
  assert.doesNotMatch(middleware, /'\/auth\/forgot-password'/);
});

test("the session guard still redirects anonymous dashboard traffic", () => {
  const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
  assert.match(middleware, /if \(!user && !isPublicRoute\(url\.pathname\)\) \{/);
  assert.match(middleware, /url\.pathname = '\/auth\/login'/);
});
