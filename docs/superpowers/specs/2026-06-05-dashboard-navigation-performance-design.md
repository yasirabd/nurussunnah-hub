# Dashboard Navigation Performance Design

## Summary

Improve perceived and actual dashboard page-switch performance across all dashboard routes. The current slowdown is likely caused by repeated Supabase auth/profile/role work on every navigation, plus development config that forces webpack and disables Turbopack filesystem cache.

## Goals

- Make page changes inside `/dashboard` feel smooth and predictable.
- Reduce duplicated Supabase calls on every dashboard request.
- Keep auth and role checks secure and server-side.
- Restore fast local development defaults unless a specific webpack-only blocker exists.
- Keep changes incremental so each step can be verified independently.

## Non-Goals

- Do not redesign the dashboard UI.
- Do not change role permissions or row-level security behavior.
- Do not rewrite all page data loading in one large refactor.
- Do not remove necessary session validation for protected routes.

## Current Bottlenecks

Every dashboard navigation currently performs overlapping work:

- `src/lib/supabase/middleware.ts` calls `auth.getUser()` and then queries `profiles` for `is_active` and `must_change_password` on protected routes.
- `src/app/dashboard/layout.tsx` calls `auth.getUser()` again, then queries `profiles` and `user_roles` for shell data.
- Many dashboard pages call `auth.getUser()` and `user_roles` again for page-level authorization.
- Some pages run serial Supabase calls that could be parallelized.
- `package.json` forces `next dev --webpack`, while `next.config.ts` disables `turbopackFileSystemCacheForDev`, which can make local navigation and rebuilds slower.

Because the user reports that all dashboard pages feel slow, the first fix should target shared navigation overhead before page-specific optimization.

## Recommended Approach

### 1. Restore Fast Development Defaults

Use Turbopack for the normal development script and remove the cache-disabling experimental setting.

Expected change:

- `npm run dev` should run `next dev`.
- Keep an explicit webpack fallback script only if needed, such as `dev:webpack`.
- Remove `experimental.turbopackFileSystemCacheForDev: false` unless there is a documented reason to keep it.

This improves local development speed without changing production behavior.

### 2. Centralize Dashboard User Context

Add a server-only helper, for example `src/lib/auth/user-context.ts`, that returns:

- `user`
- compact `profile` fields needed by the shell
- `roles`
- convenience flags such as `isAdmin`, `isHrd`, `isKepalaUnit`

The helper should:

- use `createClient()` from the existing Supabase server utility;
- call `auth.getUser()` once per request context;
- fetch profile and roles in parallel after user validation;
- return a typed object so pages do not repeat role parsing;
- redirect or return `null` consistently based on the caller's need.

### 3. Reduce Middleware Work

Keep middleware focused on coarse route protection and session refresh. Avoid querying `profiles` on every dashboard request if the same checks can be handled in the dashboard layout or a focused guard.

Proposed behavior:

- Middleware keeps unauthenticated users out of protected routes.
- Auth routes continue redirecting signed-in users away from login pages.
- Active-user and forced-password-change checks move into dashboard-level server context, where profile is already being loaded.

Security note: this still uses `auth.getUser()` server-side. It does not rely on client-only state for authorization.

### 4. Reuse Context in Dashboard Layout and Pages

`src/app/dashboard/layout.tsx` should use the centralized context for shell rendering and redirects.

Dashboard pages that only need role checks should import the same helper instead of repeating:

- `createClient()`
- `auth.getUser()`
- `user_roles` query
- role array mapping

Page-specific Supabase queries remain in each page for now. This keeps the refactor scoped while removing global duplication.

### 5. Parallelize Obvious Page Queries

After the global context cleanup, update obvious serial query groups to `Promise.all` where dependencies allow it. Good first targets:

- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/units/page.tsx`
- `src/app/dashboard/academic-years/page.tsx`
- selected portions of `src/app/dashboard/page.tsx`

The feedback page can be optimized later with server-side pagination/RPC changes because that is a larger behavioral change.

## Data Flow

1. Request enters middleware.
2. Middleware refreshes/validates session and handles broad auth redirects.
3. Dashboard layout loads one server-side user context.
4. Layout renders sidebar/header from context.
5. Page loads only data specific to its route, reusing context for authorization where practical.

## Error Handling

- If no user exists, redirect to `/auth/login`.
- If profile is inactive, redirect to `/auth/logout`.
- If `must_change_password` is true, redirect to `/dashboard/change-password` except on that route.
- If roles fail to load, default to an empty role list and let page-level guards deny restricted pages.
- If profile shell data fails to load, render fallback user labels rather than crashing the dashboard shell.

## Testing

- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Manually verify page navigation between:
  - `/dashboard`
  - `/dashboard/profile`
  - `/dashboard/feedback`
  - `/dashboard/employees`
  - `/dashboard/academic-years`
  - `/dashboard/units`
- Verify redirects for:
  - unauthenticated user
  - inactive user
  - user with `must_change_password`
  - role-restricted dashboard pages

## Rollout Order

1. Restore dev config.
2. Add user context helper.
3. Update dashboard layout.
4. Update role-guarded pages one by one.
5. Parallelize simple page query groups.
6. Build and type-check.
7. Measure whether all-page navigation feels faster before starting feedback-specific pagination work.

