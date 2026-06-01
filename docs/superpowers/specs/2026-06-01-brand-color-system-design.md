# Brand Color System Design

## Context

Nurussunnah Hub uses Next.js 16, Tailwind CSS v4, shadcn-style UI components, and semantic OKLCH tokens in `src/app/globals.css`. Most UI surfaces already consume tokens such as `primary`, `secondary`, `accent`, `muted`, `border`, `ring`, and `sidebar`, so the brand update should mainly happen at the token layer.

The previous color direction moved the app toward mint pastel. The updated requirement is to keep the official Yayasan Islam Nurus Sunnah brand colors while making the product feel modern and suitable for an internal HRD dashboard.

Official brand colors:

- Deep green: `#176d3f`
- Fresh green: `#71a72d`
- Gold: `#e3b251`
- Heritage brown: `#ac7739`

## Goal

Create a modern brand color system that uses `#176d3f` as the primary color, preserves the full Yayasan Islam Nurus Sunnah palette, and keeps the interface clean, readable, and professional.

## Selected Approach

Use a Modern Heritage palette.

This keeps `#176d3f` as the main action and identity color, uses `#71a72d` as a fresh supporting green, applies `#e3b251` as a controlled highlight color, and reserves `#ac7739` for limited heritage or status accents. Neutral surfaces should remain quiet and lightly green-tinted rather than saturated, so the app feels current instead of decorative.

This approach best fits the brand because it keeps the official colors recognizable while avoiding a heavy traditional look.

## Palette Direction

- `primary`: `#176d3f` for primary buttons, active navigation, important links, focus emphasis, and brand marks.
- `primary-foreground`: warm white for readable text on deep green.
- `background`: near-white with a very subtle green warmth, not bright mint.
- `foreground`: deep green-slate for readable text that harmonizes with the primary color.
- `card` and `popover`: clean white surfaces for forms, tables, dialogs, and dropdowns.
- `secondary`: pale green-neutral surface for low-emphasis buttons, panels, and table affordances.
- `muted`: soft green-gray for quiet backgrounds and disabled/secondary UI.
- `accent`: soft gold derived from `#e3b251` for hover states, highlighted metadata, and selected secondary surfaces.
- `success`: fresh green derived from `#71a72d` where success states or positive indicators are needed.
- `warning` or `heritage-accent`: warm brown derived from `#ac7739`, used sparingly for status badges or informational accents.
- `border` and `input`: light green-gray strokes that keep the UI crisp without strong contrast.
- `ring`: primary green, softened enough for focus outlines.
- `sidebar`: a deep green surface derived from `#176d3f`, with active states using a restrained fresh green or gold-tinted accent.
- `charts`: use all four official brand colors, plus one neutral companion if a fifth chart color is needed.

## Token Mapping

The implementation should keep the existing semantic token architecture and convert hex brand values into OKLCH tokens in `src/app/globals.css`.

- `--primary`: deep green brand color.
- `--primary-foreground`: warm white.
- `--secondary`: pale green-neutral.
- `--secondary-foreground`: deep green-slate.
- `--accent`: soft gold-tinted surface.
- `--accent-foreground`: dark olive-brown or deep green text.
- `--muted`: pale green-gray.
- `--muted-foreground`: medium green-gray.
- `--destructive`: keep an accessible red, not part of the brand palette.
- `--chart-1`: deep green `#176d3f`.
- `--chart-2`: fresh green `#71a72d`.
- `--chart-3`: gold `#e3b251`.
- `--chart-4`: heritage brown `#ac7739`.
- `--chart-5`: muted slate-green companion.
- `--sidebar`: darkened deep green.
- `--sidebar-primary`: fresh green or gold depending on contrast.
- `--sidebar-accent`: active item surface with enough contrast against the sidebar.

## Scope

Change only color system behavior:

- Update light mode semantic color tokens in `src/app/globals.css`.
- Update dark mode semantic color tokens in `src/app/globals.css` so dark mode remains brand-aligned.
- Replace remaining hardcoded color utilities in layout or auth surfaces only when they conflict with the brand system.
- Keep existing layout, typography, radius, component APIs, and database behavior unchanged.

## Out Of Scope

- No layout redesign.
- No typography changes.
- No component API changes.
- No content or copy changes.
- No new theme switcher.
- No broad refactor beyond color token cleanup.

## Accessibility

The primary color is dark enough to support white text for primary actions. Gold and brown should not be used as body-text colors on light backgrounds unless contrast is verified. Pale accent surfaces need dark foreground tokens. Sidebar text must remain high contrast against the deep green sidebar background.

Interactive states should remain clear without relying on color alone. Active navigation can use color plus weight, icon color, and the existing active dot.

## Verification

Run:

```bash
npm run build
```

Then inspect the generated UI or local app for these surfaces:

- Login/auth layout.
- Dashboard shell.
- Sidebar active and hover states.
- Header role badges and avatar fallback.
- Tables, cards, forms, buttons, dropdowns, and dialogs.
- Light and dark token contrast where dark mode exists.

Also scan for obsolete mint-pastel hardcoded colors after implementation.
