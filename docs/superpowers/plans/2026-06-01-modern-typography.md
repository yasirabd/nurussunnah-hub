# Modern Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Inter setup with a clean Geist-based typography system for the whole app.

**Architecture:** The global Next.js layout owns font loading through `next/font/google`. Tailwind v4 theme tokens in `globals.css` expose those font variables to existing `font-sans`, `font-heading`, and `font-mono` utilities without touching individual components.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `next/font/google`.

---

## File Structure

- Modify: `src/app/layout.tsx` - load Geist Sans and Geist Mono, attach both CSS variables to `<html>`.
- Modify: `src/app/globals.css` - map Tailwind font tokens to the Next font variables.

No tests are created because this is a visual/global token change with no existing unit test harness for typography. Verification is the production build plus optional browser inspection.

### Task 1: Load Geist Fonts Globally

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace the font import**

Change the import at the top of `src/app/layout.tsx` from:

```tsx
import { Inter } from "next/font/google";
```

to:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
```

- [ ] **Step 2: Replace the Inter font declaration**

Change this block in `src/app/layout.tsx`:

```tsx
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
```

to:

```tsx
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
```

- [ ] **Step 3: Attach both font variables to the root html element**

Change the `<html>` opening tag in `src/app/layout.tsx` from:

```tsx
<html lang="id" className={`${inter.variable} h-full`} suppressHydrationWarning>
```

to:

```tsx
<html
  lang="id"
  className={`${geistSans.variable} ${geistMono.variable} h-full`}
  suppressHydrationWarning
>
```

- [ ] **Step 4: Commit layout font loading**

Run:

```bash
git add src/app/layout.tsx
git commit -m "style: load geist fonts globally"
```

Expected: commit succeeds with only `src/app/layout.tsx` staged for this task.

### Task 2: Map Tailwind Font Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update font tokens in the Tailwind theme block**

Change this section in `src/app/globals.css`:

```css
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
```

to:

```css
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);
```

- [ ] **Step 2: Confirm old Inter variable is gone**

Run:

```bash
rg "font-inter|Inter" src/app
```

Expected: no matches.

- [ ] **Step 3: Commit token mapping**

Run:

```bash
git add src/app/globals.css
git commit -m "style: map typography tokens to geist"
```

Expected: commit succeeds with only `src/app/globals.css` staged for this task.

### Task 3: Verify Build

**Files:**
- No file changes expected.

- [ ] **Step 1: Run production build**

Run:

```bash
npm run build
```

Expected: build exits with code 0.

- [ ] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: only pre-existing unrelated working-tree changes remain. The typography implementation files should be committed.

