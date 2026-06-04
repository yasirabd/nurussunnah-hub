# Simple Login Page Design

## Context

Nurussunnah Hub uses Next.js 16, Tailwind CSS v4, shadcn-style UI components, and Supabase auth. The current auth screen uses a desktop split layout: a large left hero panel and a right-side login form. The requested direction is simpler: remove the landing-style feel and make the login page direct and quiet.

Current relevant files:

- `src/app/auth/layout.tsx`
- `src/app/auth/login/page.tsx`

## Goal

Create a simple login-first screen that is easy to scan on desktop and mobile. The page should focus on signing in, keep the existing authentication behavior, and avoid decorative or explanatory UI.

## Selected Approach

Use a centered compact login layout.

This removes the left hero panel entirely and centers the login experience in the viewport. The form remains visually polished through spacing, semantic brand tokens, and clear typography, but does not use a large marketing section, extra feature chips, or a separate welcome page.

## User Experience

The auth screen should show one compact column:

- Brand row with the `N` mark and `Nurussunnah Hub` name.
- Short heading: `Masuk` or equivalent concise login title.
- Short helper text explaining that users can use email or NIY.
- Email/NIY input.
- Password input with show/hide toggle.
- `Lupa password?` link near the password label.
- Full-width primary submit button.
- Small admin/HRD registration note below the form.

The layout should be centered vertically and horizontally with responsive padding. On small screens, the form should remain comfortable without requiring horizontal scrolling. On desktop, the form should stay narrow enough for fast scanning, around `400px` to `420px` max width.

## Architecture

`src/app/auth/layout.tsx` should become a simple layout wrapper for auth pages. It should provide the full-height background and centered content container. It should not include page-specific hero content or feature lists.

`src/app/auth/login/page.tsx` should continue to own the login form UI and existing client-side auth behavior. The page can keep its current React Hook Form, Zod validation, Supabase email/NIY resolution, password visibility state, toast handling, and dashboard redirect.

## Styling

Use existing semantic tokens from `src/app/globals.css`:

- `bg-background` for the page surface.
- `text-foreground` and `text-muted-foreground` for readable hierarchy.
- `bg-primary` and `text-primary-foreground` for the brand mark and submit button.
- Existing radius tokens for inputs and buttons.

The design should avoid hardcoded decorative gradients, left-side hero panels, nested cards, and large explanatory blocks. A subtle single-column composition is enough.

## Behavior

Authentication behavior must remain unchanged:

- Users can sign in with email or NIY.
- NIY input still resolves through `resolve_login_email`.
- Invalid credentials still show a clear toast error.
- Successful login still redirects to `/dashboard` and refreshes the router.
- Forgot password still links to `/auth/forgot-password`.
- Password visibility toggle still works.

## Accessibility

Labels must remain visible and connected through the existing form components. The password visibility button should remain keyboard-safe and have a clear accessible name if the current implementation lacks one. Focus states should continue to use existing tokenized ring styles.

Text should fit inside controls on mobile and desktop. The submit button should preserve loading state with the spinner and disabled state.

## Out Of Scope

- No Supabase schema or auth logic changes.
- No route changes.
- No new welcome page.
- No dashboard or sidebar redesign.
- No global color system changes.
- No new dependency.

## Verification

Run:

```bash
npm run build
```

Then inspect the auth login page at desktop and mobile widths for:

- Centered compact layout.
- No left hero panel.
- No overlapping text or controls.
- Existing login, forgot-password link, password toggle, loading state, and validation behavior still intact.
