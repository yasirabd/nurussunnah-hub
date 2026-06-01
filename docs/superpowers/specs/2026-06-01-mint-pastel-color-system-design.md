# Mint Pastel Color System Design

## Context

Nurussunnah Hub uses Next.js 16, Tailwind CSS v4, shadcn-style UI components, and global OKLCH color tokens in `src/app/globals.css`. Most interface colors already flow through semantic tokens such as `primary`, `secondary`, `accent`, `muted`, `border`, and `sidebar`. A few brand surfaces still use hardcoded OKLCH values, especially the auth layout and sidebar logo/active states.

The current palette is green-based but relatively dense and dark. The requested direction is brighter, more modern, pastel, and still grounded in green.

## Goal

Create a brighter mint pastel design system while preserving the existing layout, typography, radius scale, components, and app structure.

## Selected Approach

Use a Mint Fresh Pastel palette. This keeps green as the main identity color, shifts surfaces toward airy mint-tinted neutrals, and uses a brighter mint-green primary for actions and active states.

This approach best matches the user's request for a pastel palette while keeping the app professional enough for an internal HRD dashboard.

## Palette Direction

- `background`: near-white with a subtle mint tint.
- `foreground`: deep green-slate for readable body text.
- `card` and `popover`: clean white surfaces for tables, forms, and dialogs.
- `primary`: brighter pastel mint-green for primary buttons and selected states.
- `primary-foreground`: deep green for accessible contrast on pastel primary.
- `secondary`: very pale mint for empty states, secondary badges, and card footers.
- `accent`: aqua-mint for hover, focus, and menu interactions.
- `muted`: soft mint-gray for quiet supporting surfaces.
- `border` and `input`: light mint-gray strokes.
- `sidebar`: deep mint-slate rather than heavy dark green, keeping enough contrast for navigation.
- `charts`: balanced pastel set that still differentiates data categories.

## Scope

Change only color system surfaces:

- Update light mode semantic tokens in `src/app/globals.css`.
- Update dark mode semantic tokens in `src/app/globals.css` so dark mode remains soft and mint-aligned.
- Replace hardcoded OKLCH brand colors in `src/app/auth/layout.tsx` with either semantic tokens or matching mint pastel OKLCH values.
- Replace hardcoded OKLCH brand colors in `src/components/layout/app-sidebar.tsx` with either semantic tokens or matching mint pastel OKLCH values.

## Out of Scope

- No layout changes.
- No typography changes.
- No copy changes.
- No radius changes.
- No component API changes.
- No broad component refactor.

## Accessibility

Pastel palettes can lose contrast, so interactive elements must keep readable foreground colors. Primary actions should use dark text on the pastel mint primary. Sidebar text must remain high contrast against the deep mint-slate sidebar background. Muted text should remain readable on background, card, secondary, and accent surfaces.

## Implementation Notes

Prefer semantic tokens over new hardcoded values. Hardcoded OKLCH should only remain where the design intentionally needs a fixed decorative brand surface, such as the auth hero background or logo mark. Existing utility classes such as `bg-primary/10`, `hover:bg-primary/5`, and `border-primary/20` should benefit automatically from the new tokens.

## Verification

Run:

```bash
npm run build
```

Also scan for old hardcoded palette values in the auth layout and sidebar. If a dev server is used, visually inspect auth, dashboard, sidebar, tables, badges, and buttons for readability and pastel consistency.

