# Password Change Access Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users with `profiles.must_change_password = true` from accessing any dashboard feature until the forced password change completes.

**Architecture:** Add one server-only access module that resolves authentication and password-change state from Supabase. Dashboard routing, forced-password completion, every dashboard server-action surface, and the authenticated document route consume that central rule; the restricted page renders without the normal dashboard shell.

**Tech Stack:** Next.js 16 App Router, React 19 server components/actions, Supabase SSR/Auth, TypeScript, Node.js test runner.

---

## File Map

- Create `src/lib/auth/feature-access.ts`: central server-side access-state resolver and redirecting guards.
- Create `tests/password-change-access-gate.test.mjs`: regression checks for the guard, restricted shell, server actions, and route handler.
- Modify `src/app/dashboard/layout.tsx`: render restricted password-change content without `DashboardShell`.
- Modify `src/app/dashboard/change-password/actions.ts`: require the restricted state and update only the current profile.
- Modify all dashboard `actions.ts` files except the password-change action: enforce the central feature guard before feature work.
- Modify `src/app/dashboard/employment-documents/offer-letter/route.ts`: return unauthorized/forbidden responses from the same access state.

### Task 1: Central Feature Access Guard

**Files:**
- Create: `src/lib/auth/feature-access.ts`
- Create: `tests/password-change-access-gate.test.mjs`

- [ ] **Step 1: Write the failing guard contract test**

Add assertions that `feature-access.ts` is server-only, queries `must_change_password` for the authenticated user's profile, distinguishes unauthenticated/missing-profile/restricted/allowed states, redirects restricted feature access to `/dashboard/change-password`, and exposes a separate guard for the forced-change action.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: FAIL because `src/lib/auth/feature-access.ts` does not exist.

- [ ] **Step 3: Implement the central access module**

Create these public interfaces:

```ts
export type FeatureAccessState =
  | { status: "unauthenticated"; supabase: SupabaseClient<Database> }
  | { status: "missing_profile"; supabase: SupabaseClient<Database>; user: User }
  | { status: "password_change_required"; supabase: SupabaseClient<Database>; user: User }
  | { status: "allowed"; supabase: SupabaseClient<Database>; user: User };

export async function getFeatureAccessState(): Promise<FeatureAccessState>;
export async function requireFeatureAccess(): Promise<{ supabase: SupabaseClient<Database>; user: User }>;
export async function requirePasswordChangeAccess(): Promise<{ supabase: SupabaseClient<Database>; user: User }>;
```

`getFeatureAccessState()` must call `auth.getUser()`, then select only `must_change_password` from `profiles` with `.eq("id", user.id).maybeSingle()`. Query errors and absent profiles resolve to `missing_profile`. `requireFeatureAccess()` redirects unauthenticated users to `/auth/login`, invalid profiles to `/auth/logout`, and restricted users to `/dashboard/change-password`. `requirePasswordChangeAccess()` permits only `password_change_required`, redirects already-unrestricted users to `/dashboard`, and uses the same login/logout handling for invalid states.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: PASS for the central guard contract.

### Task 2: Restricted Dashboard Shell and Password Completion

**Files:**
- Modify: `tests/password-change-access-gate.test.mjs`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/change-password/actions.ts`
- Modify: `src/app/dashboard/change-password/page.tsx`

- [ ] **Step 1: Add failing restricted-flow tests**

Assert that the layout returns the password-change route's children before rendering `DashboardShell`, the page contains a logout control, and `changeInitialPasswordAction` calls `requirePasswordChangeAccess()` instead of independently accepting any authenticated user.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: FAIL because the current layout always renders `DashboardShell`, the page has no logout control, and the action uses `createClient()` directly.

- [ ] **Step 3: Implement the minimal restricted flow**

In the layout, preserve inactive-account handling, then use the server-derived pathname. When `must_change_password` is true, redirect any path other than `/dashboard/change-password`; for the allowed path return a minimal full-height `<main>{children}</main>` before `DashboardShell`. Keep the inverse redirect for unrestricted users.

In the action, replace direct client/user lookup with:

```ts
const { supabase, user } = await requirePasswordChangeAccess();
```

Keep validation before external writes, update Auth first, update `profiles` only with `.eq("id", user.id)`, and redirect to the dashboard only after the profile update succeeds.

Add a logout link or form targeting `/auth/logout` to the page, without adding feature navigation.

- [ ] **Step 4: Run focused and existing middleware tests**

Run: `node --test tests/password-change-access-gate.test.mjs tests/cloudflare-middleware.test.mjs`

Expected: PASS.

### Task 3: Protect Every Dashboard Server Action

**Files:**
- Modify: `tests/password-change-access-gate.test.mjs`
- Modify: `src/app/dashboard/academic-years/actions.ts`
- Modify: `src/app/dashboard/attendance-corrections/actions.ts`
- Modify: `src/app/dashboard/employees/actions.ts`
- Modify: `src/app/dashboard/employees/registrations/actions.ts`
- Modify: `src/app/dashboard/feedback/actions.ts`
- Modify: `src/app/dashboard/leave-requests/actions.ts`
- Modify: `src/app/dashboard/profile/actions.ts`
- Modify: `src/app/dashboard/units/actions.ts`

- [ ] **Step 1: Add a failing server-action inventory test**

Enumerate every dashboard `actions.ts` file except `change-password/actions.ts`. Assert each file imports `requireFeatureAccess` and invokes it in the common authorization helper or at the start of every exported server action before feature data mutation. Keep the inventory explicit so a newly added unguarded action file fails review rather than silently expanding scope.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: FAIL listing the unguarded action files.

- [ ] **Step 3: Add guards with minimal refactoring**

For files with shared authorization helpers (`academic-years`, `employees`, `employees/registrations`, `units`), call `requireFeatureAccess()` at the beginning of the helper and reuse its returned `supabase` and `user` where practical. Ensure exported actions that bypass the shared helper call `requireFeatureAccess()` directly.

For direct action files (`attendance-corrections`, `feedback`, `leave-requests`, `profile`), call `requireFeatureAccess()` as the first authentication operation in every exported action and reuse the returned client/user. Preserve all existing role, ownership, validation, redirect, and mutation behavior after the new gate.

- [ ] **Step 4: Run focused tests and type-check**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

### Task 4: Protect the Authenticated Offer-Letter Route

**Files:**
- Modify: `tests/password-change-access-gate.test.mjs`
- Modify: `src/app/dashboard/employment-documents/offer-letter/route.ts`

- [ ] **Step 1: Add a failing route-handler test**

Assert that the route calls `getFeatureAccessState()` before parsing form data or generating a document, returns `401` for unauthenticated requests, and returns `403` for missing-profile or password-change-required states.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: FAIL because the route currently checks only `auth.getUser()` and roles.

- [ ] **Step 3: Implement route enforcement**

Replace direct client/user lookup with `getFeatureAccessState()`. Return `new NextResponse("Unauthorized", { status: 401 })` for `unauthenticated`, `new NextResponse("Password change required", { status: 403 })` for `password_change_required`, and `new NextResponse("Forbidden", { status: 403 })` for `missing_profile`. Use the returned `supabase` and `user` only in the `allowed` branch, then retain the existing HRD/ADMIN role check and document generation.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/password-change-access-gate.test.mjs`

Expected: PASS.

### Task 5: Full Verification

**Files:**
- Modify only if verification reveals a regression in files already in scope.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript and diff checks**

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Review the final diff against the acceptance criteria**

Confirm the guard precedes feature work, `/dashboard/change-password` has no normal shell, only the current user's flag is cleared, failed profile updates remain restricted, route responses leak no feature data, and normal role checks remain intact.
