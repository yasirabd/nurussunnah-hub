# Premium Calm Login UI Design

## Context

Nurussunnah Hub uses Next.js 16, Tailwind CSS v4, shadcn-style UI components, and Supabase auth. The current login screen already has the correct simple single-column behavior from the previous login simplification, but the requested direction is more refined: modern minimalist, elegant, and calm without returning to a landing-page style.

Relevant files:

- `src/app/auth/layout.tsx`
- `src/app/auth/login/page.tsx`
- `src/app/globals.css`

The repository has unrelated dirty work in dashboard, employee, profile, Supabase migration, and test files. This feature must avoid touching those files.

## Goal

Refresh the login page to a `premium calm` visual style while preserving all authentication behavior. The result should feel clean, polished, and focused on signing in, with a subtle sense of depth from spacing, borders, and restrained shadow rather than heavy decoration.

## Selected Approach

Use a centered premium login shell.

The auth layout keeps the page centered and introduces a calm full-screen background using existing semantic tokens plus very subtle layered surfaces. The login page keeps a compact single-column form, wrapped in one refined panel with a thin border, soft shadow, and measured spacing.

This approach is preferred because it improves perceived quality without adding a hero section, illustration, feature list, or split layout. It also keeps the login flow fast to scan on both desktop and mobile.

## Alternatives Considered

### Editorial Split Minimal

This would add a small brand or quote panel next to the form. It could look more distinctive on desktop, but it risks reintroducing a landing-page feel and adds layout complexity on mobile.

### Ultra Flat

This would remove any panel and keep only form elements on the page. It is extremely minimal, but it would not create enough visual hierarchy for the requested premium-elegant direction.

## User Experience

The login screen should show one focused panel:

- Compact Nurussunnah brand mark at the top.
- Clear title: `Masuk ke Nurussunnah Hub`.
- Short helper text explaining users can sign in with email or NIY.
- Email/NIY input.
- Password input with show/hide toggle.
- `Lupa password?` link near the password label.
- Full-width submit button with loading spinner and disabled state.
- Small admin/HRD registration note below the form.

The panel should stay comfortable around `420px` max width on desktop and fit naturally on mobile with no horizontal scrolling. Text should not overlap controls at narrow widths.

## Visual Direction

The page should feel premium and calm through restraint:

- Use a soft page background, not a large gradient hero.
- Use one login panel only; no nested cards.
- Use thin borders and a light shadow for depth.
- Use generous but not oversized spacing.
- Keep typography compact and confident.
- Keep the brand mark simple and token-based.
- Prefer existing semantic colors: `background`, `foreground`, `muted`, `muted-foreground`, `border`, `primary`, and `primary-foreground`.

The design should avoid decorative blobs, heavy gradients, large illustrations, and marketing copy.

## Architecture

`src/app/auth/layout.tsx` owns the page-level shell: full-height background, responsive padding, centered content, and any subtle ambient background treatment.

`src/app/auth/login/page.tsx` owns the login panel and all current login behavior. It should keep React Hook Form, Zod validation, Supabase NIY email resolution, password visibility state, toast handling, and redirect behavior unchanged.

No new components are required unless the existing JSX becomes noticeably harder to read. Since this is a narrow UI refresh, local markup in `login/page.tsx` is acceptable.

## Behavior

Authentication behavior must remain unchanged:

- Email and NIY login continue to work.
- NIY input still resolves through `resolve_login_email`.
- Invalid NIY still shows the existing clear toast.
- Invalid credentials still show the existing clear toast.
- Successful login still redirects to `/dashboard` and refreshes the router.
- Forgot password still links to `/auth/forgot-password`.
- Password visibility toggle still works and remains keyboard accessible.

## Accessibility

The form must keep visible labels and clear validation messages. The password visibility button must keep a descriptive `aria-label`. Focus states must remain visible through existing component styles or tokenized Tailwind focus classes.

The refined panel must maintain adequate contrast for text, borders, and controls. The layout must work at mobile and desktop widths without clipped text or overlapping elements.

## Testing

Run:

```bash
npm run build
```

Then inspect `/auth/login` at desktop and mobile widths for:

- Centered premium calm layout.
- No split hero or decorative marketing section.
- Single refined panel only.
- No nested cards.
- No overlapping text or controls.
- Login, forgot-password link, password toggle, validation, loading state, and redirect behavior preserved.

## Out Of Scope

- No Supabase schema, RPC, or auth logic changes.
- No route changes.
- No dashboard, sidebar, or profile UI changes.
- No global color system rewrite.
- No new dependency.
- No changes to unrelated dirty work in the repository.
