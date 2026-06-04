# Feedback Table Pagination Page Size Design

Date: 2026-06-04
Project: Nurussunnah Hub

## Context

The Feedback Rekan page already paginates `Monitoring Feedback` and `Feedback Teridentifikasi`, but it uses a fixed page size of 10 and a custom pagination footer that differs from the employee directory table. The employee directory now has a clearer data-table footer with row range text, page-size dropdown, and first/previous/next/last controls. Feedback tables should use the same standard.

## Goals

1. Make `Monitoring Feedback` use the same pagination style as `Daftar Pegawai`.
2. Make `Feedback Teridentifikasi` use the same pagination style as `Daftar Pegawai`.
3. Add a page-size dropdown with options `10`, `25`, and `50` for each table.
4. Keep default page size at `10` for both tables.
5. Preserve existing unit filters, role visibility rules, anonymity rules, and RPC data loading.

## Non-Goals

- No SQL/RPC pagination changes in this batch.
- No change to feedback submission behavior.
- No redesign of `Daftar Rekan`, `Feedback Masuk`, or `Pengingat Feedback`.
- No new data-grid dependency.

## Recommended Approach

Extract the employee directory pagination footer into a reusable component and use it in both employee and feedback pages. The component should work for any route by accepting the target path, current search params, page param name, page-size param name, current page, current page size, total rows, and item label.

This is preferred over duplicating pagination markup because it keeps feedback and employee tables visually consistent. It is preferred over SQL/RPC pagination because the requested change is UI behavior, while the current RPC arrays are already available on the page.

## URL Parameters

Monitoring Feedback:

- `monitorPage`: current page, default `1`.
- `monitorPageSize`: page size, default `10`.
- `monitorUnit`: existing unit filter.

Feedback Teridentifikasi:

- `identifiedPage`: current page, default `1`.
- `identifiedPageSize`: page size, default `10`.
- `identifiedUnit`: existing unit filter.

Rules:

- Valid page sizes are `10`, `25`, and `50`.
- Invalid page sizes fall back to `10`.
- Invalid page values fall back to `1`.
- Unit filter changes reset only that table's page to `1`.
- Unit filter changes preserve that table's page size.
- Each table's pagination preserves the other table's unit, page, and page-size params.

## Reusable Pagination Component

Create `src/components/ui/data-pagination.tsx`.

Props:

- `basePath`: route path.
- `searchParams`: flattened current URL params.
- `pageParam`: page query key.
- `pageSizeParam`: page-size query key.
- `page`: current page.
- `pageSize`: current page size.
- `total`: total filtered rows.
- `itemLabel`: label used in text.

Behavior:

- Display `x-y dari total {itemLabel}`.
- Display page-size select with `10`, `25`, `50`.
- Changing page size sets that table's page param to `1`.
- Render first, previous, next, and last buttons.
- Disable first/previous on page 1.
- Disable next/last on the last page.
- Preserve unrelated query params.
- Remove `success` and `error` params when building pagination URLs.

## Feedback Page Design

Monitoring Feedback:

- Keep the current unit filter in the card header.
- Replace `TableMeta` and `PaginationLinks` with the reusable pagination footer.
- Slice rows with `monitorPageSize` instead of a fixed page size.
- Footer text uses `data monitoring` as the item label.

Feedback Teridentifikasi:

- Keep the current unit filter in the card header.
- Replace `TableMeta` and `PaginationLinks` with the reusable pagination footer.
- Slice rows with `identifiedPageSize` instead of a fixed page size.
- Footer text uses `feedback` as the item label.

Existing empty states remain unchanged.

## Employee Page Follow-Up

The employee directory should also use the reusable pagination component so the source of truth for data-table pagination is shared. Its behavior remains unchanged:

- `page`, default `1`.
- `pageSize`, default `10`.
- item label `pegawai`.

## Error Handling

- If filtered row count is 0, pagination displays `0-0 dari 0 ...` and navigation buttons are disabled.
- If current page is greater than the total pages after filtering, the component clamps display to the last available page and the current slice uses the normalized page.
- Filter forms reset only their own page param to `1`.

## Verification

Run after implementation:

- `npx tsc --noEmit --incremental false`
- `npx eslint src --max-warnings=0`
- `npm run build`

Manual smoke checks:

- Monitoring Feedback defaults to 10 rows.
- Monitoring page-size dropdown changes to 25 and 50.
- Monitoring first/previous/next/last controls preserve unit filter and identified table params.
- Monitoring unit filter resets `monitorPage=1` and preserves `monitorPageSize`.
- Feedback Teridentifikasi defaults to 10 rows.
- Feedback Teridentifikasi page-size dropdown changes to 25 and 50.
- Feedback Teridentifikasi first/previous/next/last controls preserve unit filter and monitoring table params.
- Feedback Teridentifikasi unit filter resets `identifiedPage=1` and preserves `identifiedPageSize`.
- Daftar Pegawai pagination still works after moving to the generic component.

## Acceptance Criteria

- Both Feedback tables use data-table pagination with page-size dropdown.
- Both Feedback tables default to 10 rows per page.
- Page-size options are `10`, `25`, and `50`.
- Pagination visual style matches Daftar Pegawai.
- Unit filters and pagination query params work independently for both tables.
- TypeScript, scoped ESLint, and build pass.
