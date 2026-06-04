# Unit & Organisasi Dialog UI Design

## Context

The Admin-only `/dashboard/units` page manages one organization row and the unit records used by employee profiles, assignments, feedback, and reviews. The current page works, but it keeps organization editing, unit creation, and unit editing visible at the same time. This creates a busy settings surface and makes ordinary review of the unit list feel like a data-entry screen.

The newer `/dashboard/academic-years` page already uses a cleaner pattern: a compact header action, read-only table rows, and dialogs for create/edit actions. Unit & Organisasi will follow that pattern for consistency.

## Goals

1. Make the page visually cleaner and more modern without changing data behavior.
2. Move create/edit forms into dialogs so the default page is read-focused.
3. Keep existing Admin-only access, server actions, success/error messages, and Supabase queries.
4. Preserve all current editable fields: organization name/description, unit name/code/status.
5. Keep the implementation scoped to UI structure and component organization.

## Non-Goals

- No new database fields, migrations, or RLS changes.
- No delete/deactivate workflow beyond the existing `is_active` checkbox.
- No search, filtering, sorting changes, pagination, or analytics cards.
- No redesign of Settings navigation outside the existing link target.

## Recommended Approach

Use a dialog-first layout matching the Tahun Pelajaran page.

The page header remains concise: title, description, active-unit badge, and a `Tambah Unit` button. The add form moves into an `AddUnitDialog`. Organization editing moves into an `EditOrganizationDialog`. Unit rows become read-only, with each row exposing an `Edit` button that opens `EditUnitDialog`.

This approach removes permanent form controls from the main view, reduces accidental inline edits, and keeps UI behavior consistent with the recently redesigned Academic Years management page.

## Page Layout

### Header

- Title: `Unit & Organisasi`.
- Description stays focused on managing the foundation and school unit entities.
- Right-side actions:
  - Active unit badge: `{activeUnits} unit aktif`.
  - Primary button: `Tambah Unit` with `Plus` icon.
- On small screens, badge and button stack neatly under the title area.

### Messages

Success and error query messages keep the existing alert style:

- Success: primary-tinted border/background/text.
- Error: destructive-tinted border/background/text.

### Organization Card

Replace the permanent edit form with a read-only card:

- Card title: `Organisasi`.
- Description: `Entitas induk untuk seluruh unit.`
- Content shows:
  - Organization name as the primary value.
  - Organization description if present.
  - Muted empty description text if no description exists.
  - `Edit Organisasi` outline button with `Building2` or `Pencil` icon.
- If no organization exists, keep a muted empty state. `Tambah Unit` remains disabled when no organization id is available.

### Unit List Card

Keep a single card for the unit table:

- Card title: `Daftar Unit`.
- Description: unit aktif dipakai untuk assignment, profil, feedback, dan review.
- Table columns:
  - `Kode`: compact monospace-like or font-medium value.
  - `Nama Unit`: primary text.
  - `Organisasi`: organization name or `-`.
  - `Status`: badge `Aktif` or `Non-aktif`.
  - `Aksi`: right-aligned `Edit` outline button with `Pencil` icon.
- Active rows use a subtle `bg-primary/5` highlight, matching Academic Years.
- Existing query error and empty state remain.

## Dialogs

### AddUnitDialog

Triggered from the header button.

Fields:

- Hidden `organization_id`.
- `Nama unit` input.
- `Kode` input.
- `Unit aktif` checkbox, default checked.

Footer:

- `Batal` outline button via `DialogClose`.
- `Tambah Unit` primary submit button with `Plus` icon.

Button disabled when `organization` is missing.

### EditOrganizationDialog

Triggered from the Organization card.

Fields:

- Hidden `id`.
- `Nama organisasi` input.
- `Deskripsi` textarea.

Footer:

- `Batal` outline button.
- `Simpan Organisasi` primary submit button.

### EditUnitDialog

Triggered from each table row.

Fields:

- Hidden `id`.
- `Nama unit` input.
- `Kode` input.
- `Unit aktif` checkbox reflecting current state.

Footer:

- `Batal` outline button.
- `Simpan Unit` primary submit button.

## Component Structure

Because dialogs require client interactivity, split the current server page into a server loader and a client component, following the Academic Years pattern:

- `src/app/dashboard/units/page.tsx`
  - Auth and Admin guard.
  - Fetch organization and units.
  - Parse success/error messages.
  - Pass plain data into the client component.
- `src/app/dashboard/units/units-client.tsx`
  - Render header, messages, organization card, unit table, dialogs, and local `Field` helper.
  - Import existing server actions from `./actions`.

The existing `actions.ts` remains behaviorally unchanged. UI labels and types can be adjusted only when required by the new client component boundary.

## Data Flow

1. Server page loads current user and roles.
2. Non-authenticated users redirect to `/auth/login`.
3. Non-Admin users redirect to `/dashboard`.
4. Server page fetches `organizations` and `units` as it does today.
5. Client component renders read-only data and dialog forms.
6. Form submissions call existing server actions.
7. Server actions redirect back to `/dashboard/units` with success/error query messages.

## Error Handling

- Preserve the existing query error display for unit fetch errors.
- Preserve existing action-level success/error redirects.
- If organization is missing, show the existing empty state and disable add-unit creation.
- Required form fields stay marked with `required` so browser validation still handles blank values before submit.

## Testing

Verification includes:

1. `npm run build` to catch Next.js and TypeScript issues.
2. Manual source check that `/dashboard/units` uses the dialog-first layout and no longer renders inline table inputs.
3. Browser check if a dev server is available:
   - Header badge and `Tambah Unit` button render correctly.
   - Add unit dialog opens and contains all current fields.
   - Organization card opens edit dialog.
   - Each row opens edit dialog with current values.
   - Empty/error states still render.

## Acceptance Criteria

- `/dashboard/units` default view is read-focused, not a page full of always-visible forms.
- Organization, add-unit, and edit-unit forms are all inside dialogs.
- Unit table is read-only except for explicit row action buttons.
- Current server actions and data semantics are preserved.
- Visual style is consistent with `/dashboard/academic-years`.
- Production build passes.
