# Brand Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mint-pastel color direction with a modern Yayasan Islam Nurus Sunnah brand color system using `#176d3f` as primary.

**Architecture:** Keep the existing Tailwind v4 + shadcn semantic-token architecture. Implement the brand system mostly in `src/app/globals.css`, then remove conflicting hardcoded mint OKLCH values from the auth hero and align role/status badges to the brand palette where they are user-facing.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn-style components, OKLCH CSS variables, TypeScript.

---

## File Structure

- Modify: `src/app/globals.css`  
  Owns semantic color tokens for light/dark mode, sidebar tokens, chart tokens, and the Tailwind `@theme inline` mapping.
- Modify: `src/app/auth/layout.tsx`  
  Owns the desktop auth hero. Replace mint hardcoded OKLCH utilities with brand-semantic classes and brand CSS variables.
- Modify: `src/components/layout/app-header.tsx`  
  Owns role badge color classes. Replace non-brand `sky`, `violet`, and `amber` badge classes with brand-token classes.
- Modify: `src/app/dashboard/work-statements/page.tsx`  
  Owns work statement status badge classes. Replace non-brand status colors with brand-token classes.
- Modify: `src/app/dashboard/feedback/page.tsx`  
  Owns feedback status/role badges. Replace non-brand status colors with brand-token classes.

## Task 1: Update Global Color Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Inspect the existing token block**

Run:

```bash
Get-Content -Path 'src/app/globals.css'
```

Expected: file contains comments `/* Mint pastel light tokens */`, a `:root` block, and a `.dark` block.

- [ ] **Step 2: Replace the light token block with brand tokens**

In `src/app/globals.css`, replace the comment `/* Mint pastel light tokens */` with `/* Yayasan Islam Nurus Sunnah brand light tokens */`.

Then replace only the variable values inside `:root` with this token set:

```css
  /* Surface */
  --background: oklch(0.985 0.012 128);
  --foreground: oklch(0.22 0.045 150);

  /* Card / Popover */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.045 150);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.045 150);

  /* Primary - #176d3f */
  --primary: oklch(0.47 0.115 151);
  --primary-foreground: oklch(0.985 0.012 128);

  /* Primary Container */
  --primary-container: oklch(0.93 0.055 145);
  --on-primary-container: oklch(0.25 0.075 150);

  /* Secondary */
  --secondary: oklch(0.955 0.025 132);
  --secondary-foreground: oklch(0.30 0.055 145);

  /* Muted */
  --muted: oklch(0.95 0.016 130);
  --muted-foreground: oklch(0.48 0.035 145);

  /* Accent - softened #e3b251 */
  --accent: oklch(0.91 0.075 85);
  --accent-foreground: oklch(0.28 0.055 95);

  /* Brand support */
  --success: oklch(0.64 0.145 128);
  --success-foreground: oklch(0.985 0.012 128);
  --warning: oklch(0.62 0.105 67);
  --warning-foreground: oklch(0.985 0.012 128);

  /* Destructive */
  --destructive: oklch(0.62 0.20 28);

  /* Border / Input */
  --border: oklch(0.88 0.022 132);
  --input: oklch(0.88 0.022 132);
  --ring: oklch(0.47 0.115 151);

  /* Charts - official brand palette */
  --chart-1: oklch(0.47 0.115 151);
  --chart-2: oklch(0.64 0.145 128);
  --chart-3: oklch(0.78 0.115 82);
  --chart-4: oklch(0.58 0.105 63);
  --chart-5: oklch(0.58 0.045 155);

  /* MD3 radius base */
  --radius: 0.75rem;

  /* Sidebar */
  --sidebar: oklch(0.29 0.075 151);
  --sidebar-foreground: oklch(0.97 0.012 128);
  --sidebar-primary: oklch(0.78 0.115 82);
  --sidebar-primary-foreground: oklch(0.24 0.065 151);
  --sidebar-accent: oklch(0.36 0.075 151);
  --sidebar-accent-foreground: oklch(0.99 0.01 128);
  --sidebar-border: oklch(1 0 0 / 14%);
  --sidebar-ring: oklch(0.78 0.115 82);
```

- [ ] **Step 3: Replace the dark token block with brand-aligned dark tokens**

In `src/app/globals.css`, replace only the variable values inside `.dark` with this token set:

```css
  --background: oklch(0.16 0.022 150);
  --foreground: oklch(0.94 0.014 128);
  --card: oklch(0.20 0.026 150);
  --card-foreground: oklch(0.94 0.014 128);
  --popover: oklch(0.20 0.026 150);
  --popover-foreground: oklch(0.94 0.014 128);
  --primary: oklch(0.68 0.125 145);
  --primary-foreground: oklch(0.13 0.04 150);
  --primary-container: oklch(0.30 0.08 151);
  --on-primary-container: oklch(0.90 0.06 135);
  --secondary: oklch(0.27 0.035 150);
  --secondary-foreground: oklch(0.92 0.014 128);
  --muted: oklch(0.25 0.028 150);
  --muted-foreground: oklch(0.72 0.024 132);
  --accent: oklch(0.34 0.065 85);
  --accent-foreground: oklch(0.92 0.045 85);
  --success: oklch(0.70 0.14 128);
  --success-foreground: oklch(0.13 0.04 150);
  --warning: oklch(0.72 0.105 67);
  --warning-foreground: oklch(0.13 0.04 150);
  --destructive: oklch(0.70 0.19 24);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 16%);
  --ring: oklch(0.68 0.125 145);
  --chart-1: oklch(0.68 0.125 145);
  --chart-2: oklch(0.70 0.14 128);
  --chart-3: oklch(0.78 0.115 82);
  --chart-4: oklch(0.72 0.105 67);
  --chart-5: oklch(0.68 0.045 155);
  --sidebar: oklch(0.18 0.035 151);
  --sidebar-foreground: oklch(0.94 0.014 128);
  --sidebar-primary: oklch(0.78 0.115 82);
  --sidebar-primary-foreground: oklch(0.13 0.04 150);
  --sidebar-accent: oklch(0.28 0.055 151);
  --sidebar-accent-foreground: oklch(0.94 0.014 128);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.78 0.115 82);
```

- [ ] **Step 4: Expose support tokens to Tailwind**

Inside `@theme inline`, add these mappings after `--color-destructive`:

```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
```

- [ ] **Step 5: Scan for the old mint comment**

Run:

```bash
rg -n "Mint pastel|mint pastel" src/app/globals.css
```

Expected: no matches.

- [ ] **Step 6: Commit token update**

Run:

```bash
git add src/app/globals.css
git commit -m "style: add brand color tokens"
```

Expected: commit succeeds with only `src/app/globals.css` staged.

## Task 2: Align Auth Hero With Brand Tokens

**Files:**
- Modify: `src/app/auth/layout.tsx`

- [ ] **Step 1: Replace hardcoded mint hero colors**

In `src/app/auth/layout.tsx`, make these exact replacements:

```tsx
// Before
<div className="relative hidden overflow-hidden bg-[oklch(0.28_0.06_172)] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">

// After
<div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-14">
```

```tsx
// Before
"radial-gradient(circle at 20% 50%, oklch(0.84 0.12 162) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.82 0.10 190) 0%, transparent 40%)",

// After
"radial-gradient(circle at 20% 50%, var(--sidebar-primary) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--accent) 0%, transparent 40%)",
```

```tsx
// Before
<div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[oklch(0.84_0.12_162)] shadow-lg">
  <span className="text-lg font-bold text-[oklch(0.16_0.055_166)]">N</span>

// After
<div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-sidebar-primary shadow-lg">
  <span className="text-lg font-bold text-sidebar-primary-foreground">N</span>
```

```tsx
// Before
<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[oklch(0.84_0.12_162)]">

// After
<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">
```

```tsx
// Before
<Icon className="h-4 w-4 text-[oklch(0.84_0.12_162)]" />

// After
<Icon className="h-4 w-4 text-sidebar-primary" />
```

- [ ] **Step 2: Keep readable white opacity utilities compatible**

Leave existing `text-white/55`, `text-white/62`, `text-white/82`, `text-white/38`, `border-white/10`, and `bg-white/[0.05]` utilities unchanged. They are contrast overlays on the dark hero, not mint-brand tokens.

- [ ] **Step 3: Verify old hardcoded auth OKLCH is gone**

Run:

```bash
rg -n "oklch\(" src/app/auth/layout.tsx
```

Expected: no matches.

- [ ] **Step 4: Commit auth hero update**

Run:

```bash
git add src/app/auth/layout.tsx
git commit -m "style: align auth hero with brand colors"
```

Expected: commit succeeds with only `src/app/auth/layout.tsx` staged.

## Task 3: Align Badge Utility Classes To Brand Palette

**Files:**
- Modify: `src/components/layout/app-header.tsx`
- Modify: `src/app/dashboard/work-statements/page.tsx`
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Update role badge colors in the app header**

In `src/components/layout/app-header.tsx`, replace `ROLE_COLORS` with:

```ts
const ROLE_COLORS: Record<string, string> = {
  HRD: "bg-primary/10 text-primary",
  ADMIN: "bg-warning/12 text-warning",
  KEPALA_UNIT: "bg-accent text-accent-foreground",
  PEGAWAI: "bg-success/12 text-success",
};
```

- [ ] **Step 2: Update work statement status badge colors**

In `src/app/dashboard/work-statements/page.tsx`, replace `STATUS_COLORS` with:

```ts
const STATUS_COLORS: Record<WorkStatementStatus, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SUBMITTED: "bg-accent text-accent-foreground",
  REVIEWED: "bg-warning/12 text-warning",
  APPROVED: "bg-success/12 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
  REOPENED: "bg-primary/10 text-primary",
};
```

- [ ] **Step 3: Update feedback page non-brand badge colors**

In `src/app/dashboard/feedback/page.tsx`, replace these class fragments:

```tsx
// Before
: "bg-amber-100 text-amber-800"

// After
: "bg-warning/12 text-warning"
```

```tsx
// Before
<Badge variant="secondary" className="border-0 bg-sky-100 text-sky-700">

// After
<Badge variant="secondary" className="border-0 bg-primary/10 text-primary">
```

- [ ] **Step 4: Scan for non-brand badge utility colors in touched files**

Run:

```bash
rg -n "bg-sky|text-sky|bg-violet|text-violet|bg-amber|text-amber" src/components/layout/app-header.tsx src/app/dashboard/work-statements/page.tsx src/app/dashboard/feedback/page.tsx
```

Expected: no matches.

- [ ] **Step 5: Commit badge update**

Run:

```bash
git add src/components/layout/app-header.tsx src/app/dashboard/work-statements/page.tsx src/app/dashboard/feedback/page.tsx
git commit -m "style: align badges with brand palette"
```

Expected: commit succeeds with only the three listed files staged.

## Task 4: Verify Build And Color Cleanup

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run build**

Run:

```bash
npm run build
```

Expected: build exits successfully.

- [ ] **Step 2: Scan source for obsolete mint OKLCH values**

Run:

```bash
rg -n "0\.84_0\.12_162|0\.84 0\.12 162|0\.82_0\.10_190|0\.82 0\.10 190|0\.28_0\.06_172|Mint pastel|mint pastel" src
```

Expected: no matches.

- [ ] **Step 3: Scan source for old non-brand badge colors**

Run:

```bash
rg -n "bg-sky|text-sky|bg-violet|text-violet|bg-amber|text-amber" src
```

Expected: either no matches, or only unrelated future files that are deliberately out of this plan. If matches remain in files covered by Task 3, fix them before continuing.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff -- src/app/globals.css src/app/auth/layout.tsx src/components/layout/app-header.tsx src/app/dashboard/work-statements/page.tsx src/app/dashboard/feedback/page.tsx
```

Expected: diff only changes color tokens and class names. No layout, copy, schema, or behavior changes.

- [ ] **Step 5: Commit verification cleanup if needed**

If Step 2 or Step 3 required cleanup, run:

```bash
git add src/app/globals.css src/app/auth/layout.tsx src/components/layout/app-header.tsx src/app/dashboard/work-statements/page.tsx src/app/dashboard/feedback/page.tsx
git commit -m "style: clean up legacy color classes"
```

Expected: commit succeeds only if cleanup changes were made. If no cleanup changes were made, skip this commit.

## Self-Review Notes

- Spec coverage: Task 1 implements light/dark semantic tokens, sidebar, chart colors, and support colors. Task 2 removes auth hero mint hardcoding. Task 3 aligns visible role/status badges to the brand palette. Task 4 verifies build and legacy color cleanup.
- Scope check: no layout, typography, API, copy, database, or new theme switcher work is included.
- Type consistency: new class names use Tailwind v4 CSS variable mappings added in Task 1: `success`, `success-foreground`, `warning`, and `warning-foreground`.
