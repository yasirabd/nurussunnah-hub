# App Tab Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Nurussunnah Hub browser tab titles and favicon metadata consistent across the app.

**Architecture:** Keep `src/app/layout.tsx` as the central browser branding source. Page files provide short page titles only, letting Next.js App Router apply the root title template to produce `Halaman | Nurussunnah Hub`.

**Tech Stack:** Next.js App Router metadata API, TypeScript, existing `src/app/favicon.ico` asset.

---

## File Structure

- Modify: `src/app/layout.tsx` - add explicit `applicationName` and `icons` metadata while preserving the existing title template and description.
- Modify: `src/app/dashboard/page.tsx` - shorten dashboard title.
- Modify: `src/app/dashboard/employees/page.tsx` - shorten employee directory title.
- Modify: `src/app/dashboard/settings/page.tsx` - shorten settings title and normalize quote style near the metadata line only.
- Modify: `src/app/dashboard/units/page.tsx` - shorten units title.
- Modify: `src/app/dashboard/profile/page.tsx` - shorten profile title.
- Modify: `src/app/dashboard/profile/edit/page.tsx` - shorten edit profile title.
- Modify: `src/app/dashboard/academic-years/page.tsx` - shorten academic years title.
- No change expected: `src/app/auth/login/metadata.ts` and `src/app/dashboard/feedback/page.tsx` already use short titles.
- Reuse: `src/app/favicon.ico` - existing favicon asset served as `/favicon.ico`.

### Task 1: Centralize Root Browser Metadata

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Confirm current root metadata**

Run:

```powershell
Get-Content -LiteralPath src\app\layout.tsx
```

Expected: the file contains this metadata block without `applicationName` or `icons`:

```ts
export const metadata: Metadata = {
  title: {
    default: "Nurussunnah Hub",
    template: "%s | Nurussunnah Hub",
  },
  description:
    "Sistem Pengelolaan Pegawai Yayasan Islam Nurus Sunnah - manajemen data pegawai, surat pernyataan kerja, dan feedback rekan kerja.",
};
```

- [ ] **Step 2: Add explicit app name and icon metadata**

Edit `src/app/layout.tsx` metadata to exactly:

```ts
export const metadata: Metadata = {
  applicationName: "Nurussunnah Hub",
  title: {
    default: "Nurussunnah Hub",
    template: "%s | Nurussunnah Hub",
  },
  description:
    "Sistem Pengelolaan Pegawai Yayasan Islam Nurus Sunnah - manajemen data pegawai, surat pernyataan kerja, dan feedback rekan kerja.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};
```

- [ ] **Step 3: Verify metadata fields are present**

Run:

```powershell
rg -n "applicationName|template:|icons:|shortcut:" src\app\layout.tsx
```

Expected output includes:

```text
17:  applicationName: "Nurussunnah Hub",
20:    template: "%s | Nurussunnah Hub",
24:  icons: {
26:    shortcut: "/favicon.ico",
```

- [ ] **Step 4: Commit root metadata change**

Run:

```powershell
git add src\app\layout.tsx
git commit -m "feat: centralize app browser metadata"
```

Expected: commit succeeds with `src/app/layout.tsx` changed.

### Task 2: Shorten Page Metadata Titles

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/employees/page.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`
- Modify: `src/app/dashboard/units/page.tsx`
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/edit/page.tsx`
- Modify: `src/app/dashboard/academic-years/page.tsx`

- [ ] **Step 1: Confirm page metadata needing cleanup**

Run:

```powershell
rg -n "export const metadata" src\app\dashboard src\app\auth
```

Expected: several dashboard pages include `- Nurussunnah Hub`; `src/app/auth/login/metadata.ts` and `src/app/dashboard/feedback/page.tsx` already use short titles.

- [ ] **Step 2: Replace dashboard title**

In `src/app/dashboard/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Dashboard" };
```

- [ ] **Step 3: Replace employee directory title**

In `src/app/dashboard/employees/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Direktori Pegawai" };
```

- [ ] **Step 4: Replace settings title**

In `src/app/dashboard/settings/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Pengaturan" };
```

- [ ] **Step 5: Replace units title**

In `src/app/dashboard/units/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Unit & Organisasi" };
```

- [ ] **Step 6: Replace profile title**

In `src/app/dashboard/profile/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Profil Saya" };
```

- [ ] **Step 7: Replace edit profile title**

In `src/app/dashboard/profile/edit/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Edit Profil" };
```

- [ ] **Step 8: Replace academic years title**

In `src/app/dashboard/academic-years/page.tsx`, replace the metadata line with:

```ts
export const metadata: Metadata = { title: "Tahun Pelajaran" };
```

- [ ] **Step 9: Verify no page title hardcodes app suffix**

Run:

```powershell
rg -n "title: .*Nurussunnah Hub" src\app
```

Expected output includes only `src\app\layout.tsx` lines for the default title and template. It should not include any route-level page metadata.

- [ ] **Step 10: Commit page title cleanup**

Run:

```powershell
git add src\app\dashboard\page.tsx src\app\dashboard\employees\page.tsx src\app\dashboard\settings\page.tsx src\app\dashboard\units\page.tsx src\app\dashboard\profile\page.tsx src\app\dashboard\profile\edit\page.tsx src\app\dashboard\academic-years\page.tsx
git commit -m "fix: standardize browser tab titles"
```

Expected: commit succeeds with only the seven dashboard page files changed.

### Task 3: Verify Build and Metadata Behavior

**Files:**
- Read: `src/app/layout.tsx`
- Read: route files changed in Task 2

- [ ] **Step 1: Run TypeScript check**

Run:

```powershell
npx tsc --noEmit
```

Expected: command exits 0 with no TypeScript errors.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: command exits 0 and Next.js completes the production build.

- [ ] **Step 3: Inspect metadata declarations**

Run:

```powershell
rg -n "applicationName|icons:|title: \"|title: '" src\app\layout.tsx src\app\auth\login\metadata.ts src\app\dashboard\page.tsx src\app\dashboard\feedback\page.tsx src\app\dashboard\employees\page.tsx src\app\dashboard\settings\page.tsx src\app\dashboard\units\page.tsx src\app\dashboard\profile\page.tsx src\app\dashboard\profile\edit\page.tsx src\app\dashboard\academic-years\page.tsx
```

Expected titles:

```text
src\app\layout.tsx:17:  applicationName: "Nurussunnah Hub",
src\app\layout.tsx:19:    default: "Nurussunnah Hub",
src\app\layout.tsx:20:    template: "%s | Nurussunnah Hub",
src\app\layout.tsx:24:  icons: {
src\app\auth\login\metadata.ts:4:  title: "Masuk",
src\app\dashboard\page.tsx:7:export const metadata: Metadata = { title: "Dashboard" };
src\app\dashboard\feedback\page.tsx:30:export const metadata: Metadata = { title: "Feedback Rekan Kerja" };
src\app\dashboard\employees\page.tsx:20:export const metadata: Metadata = { title: "Direktori Pegawai" };
src\app\dashboard\settings\page.tsx:10:export const metadata: Metadata = { title: "Pengaturan" };
src\app\dashboard\units\page.tsx:7:export const metadata: Metadata = { title: "Unit & Organisasi" };
src\app\dashboard\profile\page.tsx:6:export const metadata: Metadata = { title: "Profil Saya" };
src\app\dashboard\profile\edit\page.tsx:7:export const metadata: Metadata = { title: "Edit Profil" };
src\app\dashboard\academic-years\page.tsx:7:export const metadata: Metadata = { title: "Tahun Pelajaran" };
```

- [ ] **Step 4: Confirm favicon asset exists**

Run:

```powershell
Get-Item -LiteralPath src\app\favicon.ico | Select-Object Name,Length,LastWriteTime
```

Expected: command returns one `favicon.ico` item with `Length` greater than 0.

- [ ] **Step 5: Commit any verification-only adjustments**

If verification required no code edits, skip this step. If a previous step exposed a typo and it was fixed, run:

```powershell
git add src\app\layout.tsx src\app\dashboard\page.tsx src\app\dashboard\employees\page.tsx src\app\dashboard\settings\page.tsx src\app\dashboard\units\page.tsx src\app\dashboard\profile\page.tsx src\app\dashboard\profile\edit\page.tsx src\app\dashboard\academic-years\page.tsx
git commit -m "fix: correct app metadata verification issues"
```

Expected: commit succeeds only if verification found and fixed an issue.
