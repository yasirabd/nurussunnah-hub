# Mint Pastel Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dense green palette with a brighter mint pastel color system while preserving layout, typography, radius, and component structure.

**Architecture:** Global semantic color tokens in `src/app/globals.css` drive most UI surfaces through Tailwind v4 and shadcn-style components. Hardcoded brand colors in auth and sidebar are updated to match the same mint pastel system so the palette is consistent across shell, auth, buttons, badges, tables, and navigation.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, OKLCH color tokens.

---

## File Structure

- Modify: `src/app/globals.css` - update light and dark semantic color tokens to mint pastel values.
- Modify: `src/app/auth/layout.tsx` - replace old dark-green brand panel and mark colors with mint pastel values.
- Modify: `src/components/layout/app-sidebar.tsx` - replace old hardcoded sidebar logo and active icon colors with mint pastel values.

No automated unit tests are created because this is a visual token change. Verification is a production build plus source scans for old hardcoded palette values.

### Task 1: Update Global Mint Pastel Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace light-mode tokens**

Replace the entire `:root { ... }` token block in `src/app/globals.css` with:

```css
:root {
  /* Surface */
  --background: oklch(0.985 0.018 165);
  --foreground: oklch(0.19 0.035 168);

  /* Card / Popover */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.19 0.035 168);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.19 0.035 168);

  /* Primary (mint pastel) */
  --primary: oklch(0.82 0.12 162);
  --primary-foreground: oklch(0.18 0.055 166);

  /* Primary Container */
  --primary-container: oklch(0.93 0.055 160);
  --on-primary-container: oklch(0.19 0.055 166);

  /* Secondary */
  --secondary: oklch(0.955 0.026 165);
  --secondary-foreground: oklch(0.28 0.035 168);

  /* Muted */
  --muted: oklch(0.95 0.018 168);
  --muted-foreground: oklch(0.48 0.028 170);

  /* Accent */
  --accent: oklch(0.92 0.055 178);
  --accent-foreground: oklch(0.21 0.055 176);

  /* Destructive */
  --destructive: oklch(0.62 0.20 28);

  /* Border / Input */
  --border: oklch(0.88 0.026 166);
  --input: oklch(0.88 0.026 166);
  --ring: oklch(0.74 0.12 162);

  /* Charts */
  --chart-1: oklch(0.76 0.12 162);
  --chart-2: oklch(0.78 0.10 190);
  --chart-3: oklch(0.78 0.11 82);
  --chart-4: oklch(0.78 0.10 260);
  --chart-5: oklch(0.78 0.11 25);

  /* MD3 radius base */
  --radius: 0.75rem;

  /* Sidebar */
  --sidebar: oklch(0.31 0.055 172);
  --sidebar-foreground: oklch(0.97 0.012 165);
  --sidebar-primary: oklch(0.84 0.12 162);
  --sidebar-primary-foreground: oklch(0.17 0.055 166);
  --sidebar-accent: oklch(0.39 0.06 172);
  --sidebar-accent-foreground: oklch(0.98 0.012 165);
  --sidebar-border: oklch(1 0 0 / 14%);
  --sidebar-ring: oklch(0.84 0.12 162);
}
```

- [ ] **Step 2: Replace dark-mode tokens**

Replace the entire `.dark { ... }` token block in `src/app/globals.css` with:

```css
.dark {
  --background: oklch(0.16 0.018 172);
  --foreground: oklch(0.94 0.018 165);
  --card: oklch(0.20 0.022 172);
  --card-foreground: oklch(0.94 0.018 165);
  --popover: oklch(0.20 0.022 172);
  --popover-foreground: oklch(0.94 0.018 165);
  --primary: oklch(0.82 0.12 162);
  --primary-foreground: oklch(0.16 0.055 166);
  --primary-container: oklch(0.31 0.08 166);
  --on-primary-container: oklch(0.90 0.06 160);
  --secondary: oklch(0.27 0.03 172);
  --secondary-foreground: oklch(0.92 0.018 165);
  --muted: oklch(0.25 0.026 172);
  --muted-foreground: oklch(0.72 0.024 168);
  --accent: oklch(0.31 0.055 178);
  --accent-foreground: oklch(0.93 0.025 175);
  --destructive: oklch(0.70 0.19 24);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 16%);
  --ring: oklch(0.78 0.12 162);
  --chart-1: oklch(0.82 0.11 162);
  --chart-2: oklch(0.78 0.10 190);
  --chart-3: oklch(0.80 0.10 82);
  --chart-4: oklch(0.76 0.10 260);
  --chart-5: oklch(0.78 0.11 25);
  --sidebar: oklch(0.18 0.026 172);
  --sidebar-foreground: oklch(0.94 0.018 165);
  --sidebar-primary: oklch(0.82 0.12 162);
  --sidebar-primary-foreground: oklch(0.16 0.055 166);
  --sidebar-accent: oklch(0.28 0.045 172);
  --sidebar-accent-foreground: oklch(0.94 0.018 165);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.82 0.12 162);
}
```

- [ ] **Step 3: Run token smoke scan**

Run:

```bash
rg "seed: #1A6B3C|MD3 green|earthy tone|dark green" src/app/globals.css
```

Expected: no matches.

### Task 2: Align Auth Brand Panel Colors

**Files:**
- Modify: `src/app/auth/layout.tsx`

- [ ] **Step 1: Replace auth panel background class**

Change:

```tsx
<div className="relative hidden overflow-hidden bg-[oklch(0.17_0.05_158)] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
```

to:

```tsx
<div className="relative hidden overflow-hidden bg-[oklch(0.28_0.06_172)] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
```

- [ ] **Step 2: Replace auth decorative radial colors**

Change:

```tsx
background:
  "radial-gradient(circle at 20% 50%, oklch(0.72 0.13 155) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.62 0.12 72) 0%, transparent 40%)",
```

to:

```tsx
background:
  "radial-gradient(circle at 20% 50%, oklch(0.84 0.12 162) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.82 0.10 190) 0%, transparent 40%)",
```

- [ ] **Step 3: Replace auth mark and highlight colors**

In `src/app/auth/layout.tsx`, replace all exact class fragments:

```tsx
bg-[oklch(0.72_0.13_155)]
```

with:

```tsx
bg-[oklch(0.84_0.12_162)]
```

Replace all exact class fragments:

```tsx
text-[oklch(0.72_0.13_155)]
```

with:

```tsx
text-[oklch(0.84_0.12_162)]
```

Replace all exact class fragments:

```tsx
text-[oklch(0.14_0.04_158)]
```

with:

```tsx
text-[oklch(0.16_0.055_166)]
```

### Task 3: Align Sidebar Brand Colors

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Replace sidebar logo mark colors**

In `src/components/layout/app-sidebar.tsx`, replace:

```tsx
bg-[oklch(0.72_0.13_155)]
```

with:

```tsx
bg-sidebar-primary
```

Replace:

```tsx
text-[oklch(0.14_0.04_158)]
```

with:

```tsx
text-sidebar-primary-foreground
```

- [ ] **Step 2: Replace sidebar active and icon colors**

Replace:

```tsx
"bg-[oklch(0.28_0.05_158)] text-sidebar-accent-foreground"
```

with:

```tsx
"bg-sidebar-accent text-sidebar-accent-foreground"
```

Replace:

```tsx
"text-[oklch(0.72_0.13_155)]"
```

with:

```tsx
"text-sidebar-primary"
```

### Task 4: Verify Color System

**Files:**
- No file changes expected.

- [ ] **Step 1: Scan for old hardcoded palette values**

Run:

```bash
rg "0\.72_0\.13_155|0\.72 0\.13 155|0\.14_0\.04_158|0\.28_0\.05_158|0\.17_0\.05_158|0\.62 0\.12 72" src/app src/components/layout
```

Expected: no matches.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build exits with code 0. Existing Next middleware deprecation warning may appear and is unrelated.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: modified implementation files are `src/app/globals.css`, `src/app/auth/layout.tsx`, and `src/components/layout/app-sidebar.tsx`. Pre-existing unrelated untracked files may remain.

