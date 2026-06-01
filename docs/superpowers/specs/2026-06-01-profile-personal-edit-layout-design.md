# Profile Personal Edit and Layout Design

Date: 2026-06-01

## Goal

Allow each user to edit their own contact and personal data while keeping employment data read-only. Improve the `Profil Saya` card layout so long contact fields such as email and addresses have enough horizontal space.

## Scope

- Extend self-service profile editing to include personal data fields: gender, marital status, birth place, birth date, and last education.
- Keep employment fields read-only: NIY, home unit, employment status, account status, roles, position histories, and unit assignments.
- Improve the read-only profile layout for `Data Pribadi`, `Kontak`, and `Kepegawaian`.
- Keep changes scoped to the profile feature.

## UX Design

`/dashboard/profile` will use a more intentional layout:

- Hero remains the main identity area with avatar, name, NIY, unit, badges, and `Edit Profil` button.
- Below the hero, use a responsive layout where `Kontak` gets more space than the other cards.
- `Kontak` rows for email, KTP address, and domicile address render full width with wrapped text.
- `Data Pribadi` stays compact for short fields.
- `Kepegawaian` is visually read-only and grouped separately as official employment information.
- Histori jabatan and penugasan unit stay below the summary cards.

`/dashboard/profile/edit` will use one form with two sections:

- `Data Pribadi`: gender, marital status, birth place, birth date, last education.
- `Kontak`: phone, avatar URL, facebook, instagram, twitter, KTP address, domicile address.
- Email is not editable here because it is Supabase Auth email, not a profile field in the current form.
- Buttons remain `Batal` and `Simpan Perubahan`.

## Architecture

- Modify `src/components/profile/profile-view.tsx` for the new display layout and row sizing variants.
- Modify `src/components/profile/profile-edit-form.tsx` to add personal data fields and section headers.
- Modify `src/app/dashboard/profile/actions.ts` to update only the current user's editable personal/contact fields.
- Keep `src/app/dashboard/profile/edit/page.tsx` as the existing authenticated edit route.

## Data Flow

- Profile view reads profile, related unit, position histories, assignments, roles, and auth email as it does today.
- Edit route reads the current user's `profiles` row.
- Submit calls `updateMyProfileAction`.
- Action updates contact and personal fields only where `id = user.id`.
- Action revalidates `/dashboard/profile` and redirects back with success/error query param.

## Error Handling

- Missing auth redirects to `/auth/login`.
- Missing profile redirects back to `/dashboard/profile` with an error.
- Blank optional text fields become `null`.
- Employment fields are not accepted from form data and cannot be changed by this action.

## Testing

- Run `npx tsc --noEmit`.
- Run `npm run lint`.
- Run `npm run build` and report whether it produces a reliable exit result in this environment.
- Manually inspect changed profile files and ensure only profile-related files are staged.
