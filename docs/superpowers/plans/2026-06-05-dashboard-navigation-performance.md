# Dashboard Navigation Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce shared dashboard navigation latency by removing duplicated auth/profile/role work and restoring fast local dev defaults.

**Architecture:** Middleware remains the coarse session gate and passes the current pathname in a request header. A cached server-only dashboard user context loads the authenticated user, compact profile, and roles once per render request, then layout and pages reuse it for shell rendering and role guards. Page-specific data remains in each route, with simple query groups parallelized.

**Tech Stack:** Next.js 16 App Router, React 19 server components, `react/cache`, Supabase SSR (`@supabase/ssr`), TypeScript strict mode.

---

## File Structure

- Modify: `package.json` restores `npm run dev` to Turbopack and keeps `dev:webpack` as fallback.
- Modify: `next.config.ts` removes the Turbopack filesystem cache override.
- Create: `src/lib/auth/user-context.ts` owns cached server-side dashboard auth/profile/role context.
- Modify: `src/lib/supabase/middleware.ts` removes per-request profile query and forwards `x-pathname`.
- Modify: `src/app/dashboard/layout.tsx` uses the centralized context and handles inactive/password redirects.
- Modify: `src/app/dashboard/settings/page.tsx` reuses context for admin guard.
- Modify: `src/app/dashboard/units/page.tsx` reuses context and parallelizes organizations/units queries.
- Modify: `src/app/dashboard/academic-years/page.tsx` reuses context for HRD/Admin guard.
- Modify: `src/app/dashboard/profile/page.tsx` reuses context and parallelizes profile detail queries.
- Modify: `src/app/dashboard/employees/page.tsx` reuses context for user/roles.
- Modify: `src/app/dashboard/feedback/page.tsx` reuses context and parallelizes independent RPC calls after active year load.
- Modify: `src/app/dashboard/page.tsx` reuses context for user/profile/roles and parallelizes active year/personal feedback where possible.

## Task 1: Restore Development Defaults

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Inspect current diff before editing**

Run:

```powershell
git diff -- package.json next.config.ts
```

Expected: shows existing uncommitted edits that force webpack and disable Turbopack dev cache.

- [ ] **Step 2: Update `package.json` scripts**

Change the `scripts` block to keep Turbopack as default and webpack as explicit fallback:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:webpack": "next dev --webpack",
    "dev:clean": "node -e \"require('node:fs').rmSync('.next/dev', { recursive: true, force: true })\" && next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "migrate": "node scripts/migrate.mjs",
    "seed": "node scripts/seed.mjs"
  }
}
```

Only replace the `scripts` object. Leave dependencies unchanged.

- [ ] **Step 3: Simplify `next.config.ts`**

Replace the file with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Verify config parses**

Run:

```powershell
npx tsc --noEmit
```

Expected: TypeScript completes without config-related errors. Existing unrelated type errors, if any, must be recorded before continuing.

- [ ] **Step 5: Commit dev config**

Run:

```powershell
git add package.json next.config.ts
git commit -m "chore: restore fast next dev defaults"
```

Expected: commit succeeds.

## Task 2: Add Cached Dashboard User Context

**Files:**
- Create: `src/lib/auth/user-context.ts`

- [ ] **Step 1: Create the auth directory if needed**

Run:

```powershell
New-Item -ItemType Directory -Force -Path src\lib\auth
```

Expected: directory exists.

- [ ] **Step 2: Add the context helper**

Create `src/lib/auth/user-context.ts` with:

```ts
import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { UserRoleEnum } from "@/types/database";

type DashboardProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_status: string | null;
  home_unit_id: string | null;
  is_active: boolean | null;
  must_change_password: boolean | null;
  units: { name: string | null } | null;
};

export type DashboardUserContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: DashboardProfile | null;
  roles: UserRoleEnum[];
  isAdmin: boolean;
  isHrd: boolean;
  isKepalaUnit: boolean;
};

export const getDashboardUserContext = cache(async (): Promise<DashboardUserContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, avatar_url, employee_status, home_unit_id, is_active, must_change_password, units!profiles_home_unit_id_fkey(name)"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const roles = (roleRows ?? []).map((row) => row.role as UserRoleEnum);

  return {
    supabase,
    user,
    profile: profile as DashboardProfile | null,
    roles,
    isAdmin: roles.includes("ADMIN"),
    isHrd: roles.includes("HRD"),
    isKepalaUnit: roles.includes("KEPALA_UNIT"),
  };
});
```

- [ ] **Step 3: Run type check for helper**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS. If Supabase join type inference rejects `units`, adjust only `DashboardProfile.units` to match the inferred shape; do not use `any`.

- [ ] **Step 4: Commit helper**

Run:

```powershell
git add src/lib/auth/user-context.ts
git commit -m "feat: add cached dashboard user context"
```

Expected: commit succeeds.

## Task 3: Simplify Middleware and Use Context in Layout

**Files:**
- Modify: `src/lib/supabase/middleware.ts`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Replace middleware profile checks with pathname forwarding**

Update `src/lib/supabase/middleware.ts` to:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/auth')
  const authPassThroughRoutes = ['/auth/callback', '/auth/logout', '/auth/reset-password']
  const isPublicRoute = [
    '/auth/login',
    '/auth/forgot-password',
    ...authPassThroughRoutes,
  ].includes(url.pathname)

  if (!user && !isPublicRoute) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute && !authPassThroughRoutes.includes(url.pathname)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Update dashboard layout to enforce profile redirects once**

Replace `src/app/dashboard/layout.tsx` with:

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getDashboardUserContext } from "@/lib/auth/user-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardUserContext();
  if (!context) redirect("/auth/login");

  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";
  const isChangePasswordRoute = pathname === "/dashboard/change-password";

  if (context.profile && !context.profile.is_active) redirect("/auth/logout");
  if (context.profile?.must_change_password && !isChangePasswordRoute) {
    redirect("/dashboard/change-password");
  }
  if (context.profile && !context.profile.must_change_password && isChangePasswordRoute) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar roles={context.roles} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader profile={context.profile} roles={context.roles} />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check layout and middleware**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit middleware/layout**

Run:

```powershell
git add src\lib\supabase\middleware.ts src\app\dashboard\layout.tsx
git commit -m "feat: centralize dashboard auth checks"
```

Expected: commit succeeds.

## Task 4: Reuse Context in Role-Guarded Admin Pages

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`
- Modify: `src/app/dashboard/units/page.tsx`
- Modify: `src/app/dashboard/academic-years/page.tsx`

- [ ] **Step 1: Update settings page guard**

In `src/app/dashboard/settings/page.tsx`, remove `createClient` import and replace the initial auth block with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect('/auth/login');
if (!context.isAdmin) redirect('/dashboard');
```

Add import:

```ts
import { getDashboardUserContext } from '@/lib/auth/user-context';
```

- [ ] **Step 2: Update units page guard and parallel data**

In `src/app/dashboard/units/page.tsx`, replace the auth/role block and data queries with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect("/auth/login");
if (!context.isAdmin) redirect("/dashboard");

const [{ data: organizations }, { data: units, error }] = await Promise.all([
  context.supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: true }),
  context.supabase
    .from("units")
    .select("*, organizations(name)")
    .order("code", { ascending: true }),
]);
```

Remove the local `createClient` import. Add:

```ts
import { getDashboardUserContext } from "@/lib/auth/user-context";
```

- [ ] **Step 3: Update academic years page guard**

In `src/app/dashboard/academic-years/page.tsx`, replace the auth/role block with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect("/auth/login");

const canManage = context.isHrd || context.isAdmin;
if (!canManage) redirect("/dashboard");

const { data: years, error } = await context.supabase
  .from("academic_years")
  .select("*")
  .order("start_date", { ascending: false });
```

Remove local `createClient`. Add:

```ts
import { getDashboardUserContext } from "@/lib/auth/user-context";
```

- [ ] **Step 4: Type-check admin page changes**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit admin page reuse**

Run:

```powershell
git add src\app\dashboard\settings\page.tsx src\app\dashboard\units\page.tsx src\app\dashboard\academic-years\page.tsx
git commit -m "refactor: reuse dashboard context in admin pages"
```

Expected: commit succeeds.

## Task 5: Reuse Context in Profile, Employees, Feedback, Dashboard

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/employees/page.tsx`
- Modify: `src/app/dashboard/feedback/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Update profile page**

Replace initial user setup in `src/app/dashboard/profile/page.tsx` with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect("/auth/login");

const [{ data: profile }, { data: positionHistories }, { data: unitAssignments }] =
  await Promise.all([
    context.supabase
      .from("profiles")
      .select("*, units!profiles_home_unit_id_fkey(id, name, code)")
      .eq("id", context.user.id)
      .single(),
    context.supabase
      .from("position_histories")
      .select("*, units(name)")
      .eq("user_id", context.user.id)
      .order("start_date", { ascending: false }),
    context.supabase
      .from("user_unit_assignments")
      .select("*, units(name, code), academic_years(name)")
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: false }),
  ]);

const roles = context.roles;
```

Use `context.user.email ?? ""` for `userEmail`. Remove the separate `user_roles` query and local `createClient` import. Add `getDashboardUserContext` import.

- [ ] **Step 2: Update employees page**

In `src/app/dashboard/employees/page.tsx`, replace auth/role setup with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect("/auth/login");

const roles = context.roles;
const canManageEmployees = context.isHrd || context.isAdmin;
const canFilterInactive = canManageEmployees;
const canOpenDirectory = canManageEmployees || context.isKepalaUnit;
if (!canOpenDirectory) redirect("/dashboard");
```

Use `const supabase = context.supabase;` before existing page-specific queries, and replace `user.id` with `context.user.id`. Remove local `auth.getUser()` and `user_roles` query.

- [ ] **Step 3: Update feedback page context and parallel RPC calls**

In `src/app/dashboard/feedback/page.tsx`, replace auth/role setup with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect("/auth/login");

const supabase = context.supabase;
const roles = context.roles;
const canViewIdentified = context.isHrd || context.isAdmin;
const canMonitor = canViewIdentified || context.isKepalaUnit;
```

After `activeYear` is loaded, replace the four serial RPC blocks with:

```ts
const [targetsResult, receivedResult, monitoringResult, identifiedResult] = activeYear
  ? await Promise.all([
      supabase.rpc("get_feedback_targets", {
        p_academic_year_id: activeYear.id,
      }),
      supabase.rpc("get_received_feedback_anonymous", {
        p_academic_year_id: activeYear.id,
      }),
      canMonitor
        ? supabase.rpc("get_feedback_monitoring_scoped", {
            p_academic_year_id: activeYear.id,
          })
        : Promise.resolve({ data: [] }),
      canViewIdentified
        ? supabase.rpc("get_feedback_identified", {
            p_academic_year_id: activeYear.id,
          })
        : Promise.resolve({ data: [] }),
    ])
  : [
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    ];

const targets = (targetsResult.data ?? []) as FeedbackTarget[];
const received = receivedResult.data ?? [];
const monitoring = (monitoringResult.data ?? []) as MonitoringRow[];
const identified = (identifiedResult.data ?? []) as IdentifiedFeedback[];
```

Remove the old `targetsData`, `receivedData`, `monitoringData`, and `identifiedData` declarations.

- [ ] **Step 4: Update dashboard page context**

In `src/app/dashboard/page.tsx`, replace the initial auth/profile/roles setup with:

```ts
const context = await getDashboardUserContext();
if (!context) redirect("/auth/login");

const supabase = context.supabase;
const profile = context.profile;
const roles = context.roles;

const { data: activeYear } = await supabase
  .from("academic_years")
  .select("id, name, start_date, end_date")
  .eq("is_active", true)
  .single();
```

Replace `user.id` in this file with `context.user.id`. Remove local `auth.getUser()`, profile query, and `user_roles` query.

- [ ] **Step 5: Type-check main page changes**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit main page reuse**

Run:

```powershell
git add src\app\dashboard\profile\page.tsx src\app\dashboard\employees\page.tsx src\app\dashboard\feedback\page.tsx src\app\dashboard\page.tsx
git commit -m "refactor: reuse dashboard context across pages"
```

Expected: commit succeeds.

## Task 6: Final Verification and Runtime Smoke Test

**Files:**
- No planned source edits unless verification exposes a defect.

- [ ] **Step 1: Run full type check**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Check git status**

Run:

```powershell
git status --short
```

Expected: no uncommitted files from this plan. If unrelated user files remain, list them and do not modify them.

- [ ] **Step 4: Start dev server**

Run:

```powershell
npm run dev
```

Expected: Next.js starts with Turbopack. Record the local URL printed by Next.

- [ ] **Step 5: Manual navigation smoke test**

In the browser, verify authenticated navigation between:

```text
/dashboard
/dashboard/profile
/dashboard/feedback
/dashboard/employees
/dashboard/academic-years
/dashboard/units
```

Expected: dashboard shell remains stable, role-restricted pages still redirect correctly, and page changes feel faster than before.

- [ ] **Step 6: Commit verification fixes if any**

If verification required fixes, run `git status --short`, add only the files changed for the fix, then commit. For example, if the fix touches the context helper and layout, run:

```powershell
git add src\lib\auth\user-context.ts src\app\dashboard\layout.tsx
git commit -m "fix: stabilize dashboard performance refactor"
```

Expected: commit succeeds. If no fixes were required, skip this step.

## Self-Review Notes

- Spec coverage: dev defaults, centralized context, middleware reduction, layout reuse, page role reuse, parallel simple queries, and verification are covered by Tasks 1-6.
- Scope: feedback server-side pagination/RPC redesign is intentionally excluded because the spec marks it as a later larger change.
- Risk: moving `must_change_password` checks from middleware to layout depends on forwarding `x-pathname`; Task 3 includes that explicit header path.
- Type risk: Supabase join inference for `units` may require a precise `DashboardProfile` adjustment during Task 2; the plan forbids `any` and requires type-check evidence.
