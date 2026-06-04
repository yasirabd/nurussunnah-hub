# Islamic Greetings Copy Design

## Summary

Add a light Islamic tone to the login and dashboard greeting copy without changing authentication behavior, data flow, or layout structure.

## Goals

- Make the login page greet users with a complete Islamic salam.
- Replace time-based dashboard greetings with a short salam.
- Keep the app professional, operational, and easy to scan.
- Avoid visual redesign, decorative ornaments, or new interaction states.

## Non-Goals

- Do not change Supabase login behavior.
- Do not change dashboard data loading.
- Do not add Islamic visual motifs, backgrounds, icons, or new theme colors.
- Do not rewrite copy across the whole product in this change.

## Copy Changes

Login page:

- Replace the heading `Masuk` with `Assalamu'alaikum warahmatullahi wabarakatuh`.
- Replace the helper copy with `Masuk dengan email atau NIY untuk melanjutkan ke Nurussunnah Hub.`.
- Keep the submit button label as `Masuk`.
- Keep validation, forgot-password link, and Admin/HRD account registration copy unchanged.

Dashboard page:

- Remove the time-based greeting helper that returns `Selamat pagi`, `Selamat siang`, `Selamat sore`, or `Selamat malam`.
- Render the hero heading as `Assalamu'alaikum, {firstName}`.
- Keep the first-name fallback as `Pengguna`.
- Keep the unit/profile helper text below the heading unchanged.

## Files

- `src/app/auth/login/page.tsx`
- `src/components/dashboard/dashboard-content.tsx`

## UX Notes

The login page can use the complete salam because it is a focused entry point. The dashboard uses the shorter salam so the heading remains compact on mobile and continues to feel like an operational workspace.

## Testing

- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Manually verify login page heading and helper copy.
- Manually verify dashboard hero heading for a logged-in user.

