# Password Change Access Gate Design

**Date:** 2026-08-12  
**Status:** Approved

## Problem

The application already stores `profiles.must_change_password`, sends flagged users to `/dashboard/change-password` after login, and redirects them away from other dashboard pages in the dashboard layout. That page-level redirect is not a complete authorization boundary: feature server actions or route handlers could still be invoked directly, and the normal dashboard shell exposes navigation while the account is restricted.

Users whose password has been reset to the default password must be unable to access application features until they successfully choose a new password.

## Goals

- Treat `profiles.must_change_password` as the server-side source of truth for restricted access.
- Allow a restricted user to access only the forced password-change flow and logout.
- Prevent direct access to dashboard pages, feature server actions, and internal route handlers while restricted.
- Hide normal dashboard navigation and feature controls on the password-change page.
- Restore normal access only after the Auth password update and profile flag update both succeed.
- Cover the access boundary with automated regression tests.

## Non-Goals

- Reworking Supabase authentication or password recovery.
- Adding database-wide RLS policies for every feature table.
- Changing the admin password-reset workflow or the default-password policy.
- Redesigning the normal dashboard.

## Chosen Approach

Use a centralized application-layer guard. A shared server-only access check loads the authenticated user and profile restriction state, then rejects feature access when `must_change_password` is `true`. The dashboard layout uses the same rule for page navigation, and server actions and internal route handlers use it before reading or mutating feature data.

This approach closes direct invocation paths without the high migration risk and policy duplication of implementing the same restriction across every Supabase RLS policy.

## Access Rules

### Restricted Users

A signed-in user with `profiles.must_change_password = true` may access only:

- `/dashboard/change-password`
- the server action that completes the forced password change
- `/auth/logout`
- authentication infrastructure required to keep or end the session

All other dashboard pages, feature server actions, and internal feature route handlers are unavailable.

### Unrestricted Users

A signed-in user with `profiles.must_change_password = false` retains normal role-based access. Direct access to `/dashboard/change-password` redirects to `/dashboard`.

### Missing Profiles

The new guard does not silently treat a missing profile as unrestricted. Existing application handling for invalid or incomplete authenticated accounts remains authoritative; protected feature code must not proceed based on an absent restriction record.

## Architecture

### Central Server Guard

Introduce a focused server-only helper that:

1. verifies the current Supabase user;
2. reads the associated profile restriction state;
3. returns the authenticated context when feature access is allowed; and
4. redirects or throws a controlled authorization error when password change is required.

The helper must be reusable by server components, server actions, and route handlers. It must not trust client-provided flags, form fields, cookies containing application claims, or UI state.

### Dashboard Routing

The dashboard layout continues to enforce page-level redirects using the centralized rule:

- restricted user on any other dashboard path -> `/dashboard/change-password`;
- unrestricted user on `/dashboard/change-password` -> `/dashboard`.

The request pathname remains server-derived.

### Restricted Shell

The password-change route renders without the normal dashboard sidebar, feature navigation, search, or feature actions. It provides only:

- the password-change form;
- validation and status messages; and
- a logout control.

This is a presentation constraint in addition to server authorization, not a substitute for it.

### Feature Entry Points

Every feature mutation or sensitive server-side entry point must call the centralized guard before feature-specific role checks or data access. This includes:

- server actions under dashboard features;
- internal route handlers used by authenticated features; and
- server utilities that represent externally invokable feature operations.

Pure rendering helpers and client-only presentation utilities do not need the guard.

## Password-Change Transaction Flow

1. Validate password length, confirmation, and rejection of the known default password.
2. Verify the authenticated user and confirm that the account is currently restricted.
3. Update the password through Supabase Auth.
4. Set `profiles.must_change_password = false` for the authenticated user's profile.
5. Redirect to `/dashboard` only after both operations succeed.

If the Auth password update succeeds but clearing the profile flag fails, the account remains restricted. The user sees an actionable error and can retry the flow; no dashboard feature becomes accessible while the flag remains `true`.

The action updates only the current authenticated user's profile and never accepts a target user ID from the client.

## Error Handling

- Unauthenticated feature requests follow the existing login redirect or unauthorized response behavior.
- Restricted page navigation redirects to `/dashboard/change-password`.
- Restricted server actions fail before any feature mutation occurs, using the established redirect/error convention for their calling surface.
- Restricted route handlers return an appropriate non-success authorization response without leaking feature data.
- Password validation errors remain on the password-change page.
- Supabase Auth or profile update errors do not clear the restriction implicitly.

## Testing

Automated tests must verify:

1. a restricted user is redirected from normal dashboard pages;
2. the password-change page does not render the normal feature shell/navigation;
3. representative feature server actions invoke the centralized guard before data mutation;
4. authenticated internal feature route handlers apply the same restriction;
5. the password-change action cannot update another user's profile;
6. failure to clear the profile flag does not redirect to the dashboard;
7. an unrestricted user is redirected away from the forced-change page; and
8. existing role-based authorization still applies after the restriction is cleared.

Repository-wide static checks should prevent newly added dashboard server actions or authenticated feature route handlers from bypassing the guard where practical. Existing authentication, middleware, type-check, and build tests must continue to pass.

## Rollout

No schema migration is required because `profiles.must_change_password` already exists. The change is deployed as application code and tests. Existing users with the flag set to `true` become fully restricted immediately; users with `false` are unaffected.

## Acceptance Criteria

- A user with `must_change_password = true` cannot use any application feature through the UI or direct server invocation.
- The restricted user sees only the password-change flow and logout.
- The restriction is evaluated from server-side profile data.
- Feature access becomes available only after the password is updated and `must_change_password` is successfully set to `false`.
- Failed password or profile updates leave the account restricted.
- Normal role authorization remains unchanged for unrestricted users.
- Automated tests cover page, server action, and route-handler enforcement.
