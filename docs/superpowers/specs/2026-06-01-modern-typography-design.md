# Modern Typography Design

## Context

Nurussunnah Hub is a Next.js 16 dashboard using Tailwind CSS v4 and shadcn-style UI components. The current global font is `Inter` via `next/font/google`, but the Tailwind font token in `src/app/globals.css` maps `--font-sans` to itself. Headings also inherit the same unresolved token. This makes the typography setup less explicit than intended.

The requested direction is a clean modern dashboard typography system.

## Goal

Update the app typography to feel cleaner, sharper, and more modern while keeping the existing layout, colors, component structure, and text scale intact.

## Selected Approach

Use `Geist` as the global sans font and `Geist_Mono` as the mono font through `next/font/google`.

This is the recommended approach because Geist fits modern product dashboards, renders clearly in dense tables and forms, and works directly with the existing Next.js font pipeline without adding dependencies.

## Scope

Change only the global font system:

- Replace `Inter` with `Geist` in `src/app/layout.tsx`.
- Add `Geist_Mono` in `src/app/layout.tsx`.
- Attach both font variables to the root `<html>` class.
- Map Tailwind theme tokens in `src/app/globals.css`:
  - `--font-sans` to `var(--font-geist-sans)`.
  - `--font-mono` to `var(--font-geist-mono)`.
  - `--font-heading` to `var(--font-geist-sans)`.

## Out of Scope

- No color changes.
- No layout redesign.
- No copy changes.
- No component-level typography sweep.
- No changes to text sizes, weights, or spacing unless required to keep existing behavior working.

## User Experience

The whole app should immediately feel more current and crisp. Dashboard pages, auth screens, sidebar navigation, cards, forms, and tables should keep their current hierarchy and spacing while inheriting the new typeface.

## Implementation Notes

`next/font/google` should continue to handle font loading and optimization. No external CSS import or runtime font request should be added manually.

The existing `font-sans`, `font-heading`, and `font-mono` utility usage should continue to work through Tailwind v4 theme tokens.

## Verification

Run:

```bash
npm run build
```

If a dev server is used, visually inspect auth and dashboard pages to confirm the new typography renders consistently and no text overflow was introduced.

