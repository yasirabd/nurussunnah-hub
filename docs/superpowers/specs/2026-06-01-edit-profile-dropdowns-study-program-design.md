# Edit Profile Dropdowns and Study Program Design

Date: 2026-06-01

## Goal

Improve the `Edit Profil` form so personal data uses controlled dropdowns, tertiary education can capture a program of study, and avatar URL editing is removed.

## Scope

- Change `Status Perkawinan` from free text to a dropdown with: `Sudah Kawin`, `Belum Kawin`, `Cerai`.
- Change `Pendidikan Terakhir` from free text to a dropdown with: `SD/Sederajat`, `SMP/Sederajat`, `SMA/SMK/Sederajat`, `D1/D2/D3`, `D4/S1`, `S2`, `S3`.
- Add a new nullable `profiles.study_program` column through a Supabase migration.
- Show `Program Studi` only when selected education is `D1/D2/D3`, `D4/S1`, `S2`, or `S3`.
- Remove `URL avatar` from the edit form and stop updating `avatar_url` through `updateMyProfileAction`.
- Keep existing avatar display/header behavior and keep the old `avatar_url` column for compatibility.

## UX Design

`/dashboard/profile/edit` will keep the current two-section layout.

`Data Pribadi` changes:

- `Status Perkawinan` becomes a dropdown.
- `Pendidikan Terakhir` becomes a dropdown.
- `Program Studi` appears dynamically below/alongside education only for higher education levels.
- When the user chooses SD, SMP, or SMA/SMK level, the program study field is hidden and will be cleared on submit.

`Kontak` changes:

- Remove `URL avatar` so users are not encouraged to store external/avatar URLs.
- Keep phone, social links, KTP address, and domicile address.

`/dashboard/profile` changes:

- Show `Pendidikan Terakhir` as before.
- Show `Program Studi` only if a value exists, preferably near `Pendidikan Terakhir` in `Data Pribadi`.

## Architecture

- Add a Supabase migration that runs `alter table public.profiles add column if not exists study_program text;`.
- Update `src/types/database.ts` so `profiles.Row`, `profiles.Insert`, and `profiles.Update` include `study_program`.
- Modify `src/components/profile/profile-edit-form.tsx` to use controlled client state for the education dropdown and conditional program study field.
- Modify `src/app/dashboard/profile/actions.ts` to whitelist `study_program`, clear it for non-tertiary education, and stop updating `avatar_url`.
- Modify `src/components/profile/profile-view.tsx` to display `study_program` when present.

## Data Flow

- Edit route fetches the current user's profile row, now including `study_program` through the generated/local DB type.
- Client form initializes selected education from `profile.last_education`.
- Submit posts `last_education` and optionally `study_program` to `updateMyProfileAction`.
- Server action validates whether the chosen education level allows program study.
- Server action updates only the authenticated user's row via `.eq('id', user.id)`.
- Server action revalidates `/dashboard/profile` and redirects back with success/error query param.

## Error Handling

- Missing auth still redirects to `/auth/login`.
- Missing profile still redirects back to profile with an error.
- Blank optional fields become `null`.
- Invalid marital status becomes `null` rather than storing arbitrary text.
- Invalid education value becomes `null` and clears `study_program`.
- `study_program` is stored only for `D1/D2/D3`, `D4/S1`, `S2`, or `S3`.

## Supabase Notes

- This is an additive nullable column migration, so it should not break existing rows.
- No RLS changes are required because this changes an existing table and existing update policies continue to govern row access.
- Because `profiles` is already exposed and protected, verification should include typecheck plus migration review. If Supabase CLI/MCP is available during implementation, run migration/advisor verification where practical.

## Testing

- Run `npx tsc --noEmit`.
- Run `npm run lint`.
- Attempt `npm run build` and report whether this environment captures a reliable result.
- Inspect diff to confirm no employment fields or `avatar_url` update path are added to self-service updates.
