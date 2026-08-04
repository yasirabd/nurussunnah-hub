# Employee Directory Auto-Apply Filters Design

## Goal

In the Direktori Pegawai page, changing the unit or active-status dropdown applies the filter immediately, without clicking `Terapkan`.

## Current State

`src/app/dashboard/employees/page.tsx` is a server component. Its filter form (a plain GET form) holds a search input (`q`), a unit `<select>`, an active-status `<select>`, hidden `page` and `pageSize` inputs, and a `Terapkan` submit button. Nothing happens until the user submits.

Server components cannot attach `onChange`, so the form must move into a client component.

## Design

### Component boundary

Add `src/app/dashboard/employees/_components/directory-filter-form.tsx`, marked `"use client"`, with the existing form markup moved into it unchanged.

```
type DirectoryFilterFormProps = {
  q: string;
  unitId: string;          // the page's normalizedUnitId
  active: string;
  pageSize: number;
  units: { id: string; name: string; code: string }[];
  canManageEmployees: boolean;  // gates the "Semua unit" option
  canFilterInactive: boolean;   // gates "Non-aktif" and "Semua status"
};
```

`page.tsx` replaces the inline `<form>` with a single `<DirectoryFilterForm />` call. Query building, auth checks, and unit normalization all stay on the server. Permission decisions are computed server-side and passed down as booleans; the client component only renders what it is told.

The contract: it takes the current filter values and produces a GET navigation to `/dashboard/employees` with new query params. It can be tested without touching Supabase.

### Behavior

The form stays a plain GET form with no `action` attribute, so it submits to the current URL exactly as it does today. Both `<select>` elements gain:

```jsx
onChange={(event) => event.currentTarget.form?.requestSubmit()}
```

`requestSubmit()` is used rather than `form.submit()` because it runs the real submit path — the same one a `Terapkan` click takes. Dropdowns and the button therefore share one code path with no second branch that can diverge.

Consequences that follow from submitting the whole form:

- Text already typed in the search box is applied along with the dropdown change. After reload the search box still shows that text, so the form and the results always agree.
- The existing `<input type="hidden" name="page" value="1">` resets pagination to page 1. No new code.
- The existing hidden `pageSize` input preserves the page size.
- `Terapkan` keeps working unchanged, and remains the way to submit a text search.

Unchanged: the search input (still needs Enter or the button), the pagination `Tampilkan N` selector, and the `Reset filter` link.

This is a full page navigation, exactly as today. It removes a click; it does not make the page faster.

## Error Handling

No new error paths. A failed GET navigation is handled by the browser as it is now. Supabase query errors still render through the existing `error` branch in `page.tsx`.

## Testing

Follow the repo's source-matching UI test pattern (see `tests/employee-directory-table-ui.test.mjs`), run by `npm test` (`node --test tests/*.test.mjs`).

Add `tests/employee-directory-filter-ui.test.mjs` asserting that:

- both `<select>` elements (`name="unit"` and `name="active"`) carry an `onChange` that calls `requestSubmit()`;
- the hidden `page` input is `1` and the hidden `pageSize` input is still present;
- `<Input name="q">` has no auto-submit `onChange`, guarding against search quietly becoming auto-apply later;
- the `Terapkan` button is still rendered;
- `page.tsx` no longer contains an inline `<form` and renders `<DirectoryFilterForm`.

These lock in the design decisions, not styling details.

Final verification: `npm test` and `npm run build` both pass.

## Known Limitation

On native `<select>` elements on Windows, arrow-key navigation while the dropdown is closed fires `change` on every keypress, producing one navigation per option passed. This is inherent to any auto-apply native dropdown and cannot be removed without replacing `<select>` with a custom component. Mouse users are unaffected. Accepted as a trade-off, not fixed.

## Non-Goals

- Auto-applying the text search box (debounced or otherwise).
- Removing the `Terapkan` button.
- Converting the page to client-side navigation via `useRouter`.
- Changing the pagination controls, the export button, or any query logic.
- Applying the same treatment to filters on other pages (e.g. `attendance-corrections`).
