# Profile Page Redesign

Date: 2026-06-01

## Goal

Make `Profil Saya` cleaner and easier to scan by separating read-only profile viewing from profile editing. The profile page becomes a polished personal dashboard. Editing moves to its own page.

## Scope

- Redesign `/dashboard/profile` as read-only.
- Add `/dashboard/profile/edit` for editable personal profile fields.
- Reuse the existing `updateMyProfileAction` server action.
- Preserve existing Supabase data reads and update behavior.
- Keep changes scoped to the profile feature and existing UI patterns.

## UX Design

`/dashboard/profile` will show:

- A hero card with avatar, full name, NIY, home unit, active status, employee status, role badges, and an `Edit Profil` button.
- Compact information cards for contact data, personal data, and employment summary.
- Separate cards for `Histori Jabatan` and `Penugasan Unit`.
- Empty states for optional sections when no rows exist.
- Success and error alerts from query params.

`/dashboard/profile/edit` will show:

- Header with title `Edit Profil`, short context, and a back button to `Profil Saya`.
- Form fields currently embedded in the profile page: phone, avatar URL, social accounts, KTP address, domicile address.
- Submit button using the current server action.

## Architecture

- Keep `src/app/dashboard/profile/page.tsx` as the server data loader for the read-only view.
- Add `src/app/dashboard/profile/edit/page.tsx` as a server page that fetches the current user profile and renders an edit form.
- Refactor `src/components/profile/profile-view.tsx` so it only renders display UI and does not import the update action.
- Add a focused edit component if needed, likely under `src/components/profile/profile-edit-form.tsx`, to keep form code isolated.
- Continue using existing shadcn UI components and current color/radius/elevation conventions.

## Data Flow

- Profile view page fetches user, profile, position history, unit assignments, and roles.
- Edit page fetches user and profile only.
- Submit posts to `updateMyProfileAction`.
- Action updates current user's editable fields, revalidates `/dashboard/profile`, then redirects to `/dashboard/profile` with success or error query param.

## Error Handling

- Missing auth redirects to `/auth/login`.
- Missing profile shows the existing admin-contact empty state.
- Update errors are surfaced through the existing `error` query param.
- Read-only page must not expose editable controls except the navigation button.

## Testing

- Run TypeScript validation with `npx tsc --noEmit`.
- Run production build with `npm run build` if TypeScript passes.
- Manually verify `/dashboard/profile` and `/dashboard/profile/edit` render through the dev server if build tooling succeeds.
