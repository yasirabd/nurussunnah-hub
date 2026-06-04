# App Tab Branding Design

## Summary

Make the browser tab name and app icon consistent for Nurussunnah Hub by centralizing app metadata and using short per-page titles.

## Goals

- Use `Nurussunnah Hub` as the app name everywhere browser metadata needs it.
- Use the tab title format `Halaman | Nurussunnah Hub` for named pages.
- Keep the default/root title as `Nurussunnah Hub`.
- Make the favicon/icon metadata explicit instead of relying only on file discovery.

## Non-Goals

- Do not redesign the visible sidebar, header, login brand row, or in-app logo mark.
- Do not create a new icon asset unless the current favicon is missing or unreadable.
- Do not change routing, auth, layout structure, or page copy.

## Design

Root metadata in `src/app/layout.tsx` remains the single source for browser branding:

- `applicationName: "Nurussunnah Hub"`
- `title.default: "Nurussunnah Hub"`
- `title.template: "%s | Nurussunnah Hub"`
- `icons.icon` points to `/favicon.ico`
- `icons.shortcut` points to `/favicon.ico`

Page-level metadata should use short page names only. Pages that currently include `- Nurussunnah Hub` in their own title should be changed to the short label, letting the root template produce the final browser tab title. Pages already using short labels should stay unchanged.

## Expected Titles

- `/` or default metadata: `Nurussunnah Hub`
- `/auth/login`: `Masuk | Nurussunnah Hub`
- `/dashboard`: `Dashboard | Nurussunnah Hub`
- `/dashboard/profile`: `Profil Saya | Nurussunnah Hub`
- `/dashboard/profile/edit`: `Edit Profil | Nurussunnah Hub`
- `/dashboard/feedback`: `Feedback Rekan Kerja | Nurussunnah Hub`
- `/dashboard/employees`: `Direktori Pegawai | Nurussunnah Hub`
- `/dashboard/academic-years`: `Tahun Pelajaran | Nurussunnah Hub`
- `/dashboard/units`: `Unit & Organisasi | Nurussunnah Hub`
- `/dashboard/settings`: `Pengaturan | Nurussunnah Hub`

## Files

- `src/app/layout.tsx`
- `src/app/auth/login/metadata.ts`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/profile/edit/page.tsx`
- `src/app/dashboard/feedback/page.tsx`
- `src/app/dashboard/employees/page.tsx`
- `src/app/dashboard/academic-years/page.tsx`
- `src/app/dashboard/units/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/favicon.ico`

## Testing

- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Manually verify browser tab titles for login and several dashboard pages.
- Manually verify the favicon appears in the browser tab.
