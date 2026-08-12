import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const featureAccess = readFileSync("src/lib/auth/feature-access.ts", "utf8");
const dashboardLayout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
const changePasswordAction = readFileSync("src/app/dashboard/change-password/actions.ts", "utf8");
const changePasswordPage = readFileSync("src/app/dashboard/change-password/page.tsx", "utf8");
const offerLetterRoute = readFileSync(
  "src/app/dashboard/employment-documents/offer-letter/route.ts",
  "utf8",
);

test("central feature guard resolves password-change access from the server profile", () => {
  assert.match(featureAccess, /import ["']server-only["']/);
  assert.match(featureAccess, /export type FeatureAccessState/);
  assert.match(featureAccess, /auth\.getUser\(\)/);
  assert.match(featureAccess, /\.select\(["']must_change_password["']\)/);
  assert.match(featureAccess, /\.eq\(["']id["'], user\.id\)/);
  assert.match(featureAccess, /\.maybeSingle\(\)/);
  assert.match(featureAccess, /status: ["']unauthenticated["']/);
  assert.match(featureAccess, /status: ["']missing_profile["']/);
  assert.match(featureAccess, /status: ["']password_change_required["']/);
  assert.match(featureAccess, /status: ["']allowed["']/);
});

test("central guards separate feature access from forced password-change access", () => {
  assert.match(featureAccess, /export async function requireFeatureAccess/);
  assert.match(featureAccess, /featureAccessRedirect/);
  assert.match(featureAccess, /export async function requirePasswordChangeAccess/);
  assert.match(featureAccess, /passwordChangeAccessRedirect/);
});

test("access policy maps every server state to the correct destination", async () => {
  const { featureAccessRedirect, passwordChangeAccessRedirect } = await import(
    "../src/lib/auth/feature-access-policy.mjs"
  );

  assert.equal(featureAccessRedirect("unauthenticated"), "/auth/login");
  assert.equal(featureAccessRedirect("missing_profile"), "/auth/logout");
  assert.equal(featureAccessRedirect("password_change_required"), "/dashboard/change-password");
  assert.equal(featureAccessRedirect("allowed"), null);

  assert.equal(passwordChangeAccessRedirect("unauthenticated"), "/auth/login");
  assert.equal(passwordChangeAccessRedirect("missing_profile"), "/auth/logout");
  assert.equal(passwordChangeAccessRedirect("password_change_required"), null);
  assert.equal(passwordChangeAccessRedirect("allowed"), "/dashboard");
});

test("restricted password-change page renders before the normal dashboard shell", () => {
  const restrictedBranch = dashboardLayout.indexOf("if (context.profile.must_change_password");
  const restrictedReturn = dashboardLayout.indexOf("return (", restrictedBranch);
  const dashboardShell = dashboardLayout.indexOf("<DashboardShell", restrictedBranch);

  assert.ok(restrictedBranch >= 0);
  assert.ok(restrictedReturn > restrictedBranch);
  assert.ok(dashboardShell > restrictedReturn);
  assert.match(dashboardLayout.slice(restrictedReturn, dashboardShell), /<main/);
  assert.match(dashboardLayout.slice(restrictedReturn, dashboardShell), /\{children\}/);
});

test("dashboard layout rejects authenticated accounts without a profile", () => {
  assert.match(dashboardLayout, /if \(!context\.profile\) redirect\(["']\/auth\/logout["']\)/);
});

test("forced password-change action requires the restricted access state", () => {
  assert.match(changePasswordAction, /requirePasswordChangeAccess/);
  assert.match(changePasswordAction, /const \{ supabase, user \} = await requirePasswordChangeAccess\(\)/);
  assert.doesNotMatch(changePasswordAction, /createClient/);
  assert.match(changePasswordAction, /\.eq\(["']id["'], user\.id\)/);
});

test("forced password-change action confirms that the profile flag was cleared", () => {
  assert.match(changePasswordAction, /\.select\(["']id["']\)/);
  assert.match(changePasswordAction, /\.single\(\)/);
  assert.match(changePasswordAction, /profileError/);
});

test("restricted password-change page exposes logout without feature navigation", () => {
  assert.match(changePasswordPage, /href=["']\/auth\/logout["']/);
  assert.doesNotMatch(changePasswordPage, /AppSidebar|AppHeader|DashboardShell/);
});

const guardedActionFiles = [
  "src/app/dashboard/academic-years/actions.ts",
  "src/app/dashboard/attendance-corrections/actions.ts",
  "src/app/dashboard/employees/actions.ts",
  "src/app/dashboard/employees/registrations/actions.ts",
  "src/app/dashboard/feedback/actions.ts",
  "src/app/dashboard/leave-requests/actions.ts",
  "src/app/dashboard/profile/actions.ts",
  "src/app/dashboard/units/actions.ts",
];

function dashboardActionFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return dashboardActionFiles(path);
    if (entry.name !== "actions.ts") return [];
    return [relative(".", path).replaceAll("\\", "/")];
  });
}

test("dashboard server-action inventory is explicit", () => {
  const actual = dashboardActionFiles("src/app/dashboard")
    .filter((path) => path !== "src/app/dashboard/change-password/actions.ts")
    .sort();
  assert.deepEqual(actual, [...guardedActionFiles].sort());
});

for (const path of guardedActionFiles) {
  test(`${path} gates every exported server action before feature work`, () => {
    const source = readFileSync(path, "utf8");
    assert.match(source, /import \{ requireFeatureAccess \} from ["']@\/lib\/auth\/feature-access["']/);

    const names = [...source.matchAll(/export async function\s+(\w+)/g)].map((match) => match[1]);
    assert.ok(names.length > 0);

    for (const name of names) {
      const signature = source.indexOf(`export async function ${name}`);
      const body = source.indexOf("{", signature);
      assert.match(
        source.slice(body, body + 120),
        /^\{\s*await requireFeatureAccess\(\);/,
        `${name} must call requireFeatureAccess() first`,
      );
    }
  });
}

test("authenticated feature route rejects restricted access before reading its payload", () => {
  assert.match(offerLetterRoute, /getFeatureAccessState/);
  assert.ok(
    offerLetterRoute.indexOf("getFeatureAccessState()") < offerLetterRoute.indexOf("request.formData()"),
  );
  assert.match(offerLetterRoute, /status === ["']unauthenticated["'][\s\S]*status: 401/);
  assert.match(offerLetterRoute, /status === ["']password_change_required["'][\s\S]*status: 403/);
  assert.match(offerLetterRoute, /status === ["']missing_profile["'][\s\S]*status: 403/);
});
