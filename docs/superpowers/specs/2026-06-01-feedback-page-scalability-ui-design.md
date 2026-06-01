# Feedback Page Scalability UI Design

## Context

The Feedback Rekan page currently renders all peer feedback targets, received feedback, monitoring rows, and identified feedback records in one vertical flow. This becomes hard to scan when many employees exist.

## Goals

- Keep the page compact for large employee counts.
- Preserve existing feedback submission behavior and anonymity rules.
- Show reminder progress by unit, not by individual employee badges.
- Add unit filtering and pagination to Monitoring Feedback and Feedback Teridentifikasi.
- Improve mobile/tablet table behavior.

## Design

Use a hybrid interaction model. Server components keep data loading, filtering, and pagination through URL query params. A small client component handles the Daftar Rekan carousel so employees can move between one feedback form at a time without a page reload.

## Components

- `src/app/dashboard/feedback/page.tsx`: parses URL params, derives units, filters/slices monitoring and identified rows, renders unit reminder summaries, tables, pagination controls, and received feedback scroll panel.
- `src/app/dashboard/feedback/feedback-target-carousel.tsx`: client carousel for feedback target forms. It shows one target form at a time, previous/next buttons, a select jump control, and completed status.

## Data Flow

1. Page loads all RPC data for the active academic year as before.
2. Query params control monitor unit/page and identified unit/page.
3. Unit options are derived from monitoring and identified data.
4. Pagination uses fixed page size 10.
5. Daftar Rekan receives target data and active academic year id, then handles target navigation client-side.

## UX Details

- Feedback Masuk uses an internal scroll area to avoid pushing the page down.
- Pengingat Feedback shows one progress row per unit with completed targets, total targets, percent, and employees incomplete.
- Monitoring Feedback and Feedback Teridentifikasi include filter forms, reset links, table result summaries, empty states, and pagination controls.
- Daftar Rekan dropdown hides user ids; the trigger shows the active peer name and the option list shows name plus unit.
- Pagination controls use a table-style footer row with previous/next actions and bounded page numbers.
- Tables use horizontal overflow wrappers for small screens.

## Testing

- `npx tsc --noEmit` must pass.
- `npm run build` should pass or surface only unrelated existing environment issues.
