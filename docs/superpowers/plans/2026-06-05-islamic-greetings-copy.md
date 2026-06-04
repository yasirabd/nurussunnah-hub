# Islamic Greetings Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Islamic salam copy to the login page and dashboard hero without changing auth, data flow, or layout behavior.

**Architecture:** This is a copy-only UI change in two existing client components. The login page keeps its current form and Supabase auth logic; the dashboard content removes the time-based greeting helper and renders a fixed salam with the existing first-name fallback.

**Tech Stack:** Next.js 16 App Router, React client components, TypeScript, Tailwind CSS.

---

## File Structure

- Modify: `src/app/auth/login/page.tsx` - replace login heading and helper copy.
- Modify: `src/components/dashboard/dashboard-content.tsx` - remove time-based greeting helper and render short salam.

## Task 1: Login Salam Copy

**Files:**
- Modify: `src/app/auth/login/page.tsx`

- [ ] **Step 1: Confirm current login copy**

Run:

```powershell
rg -n "Masuk|Gunakan email" src\app\auth\login\page.tsx
```

Expected: finds the `Masuk` heading, submit button, and helper copy `Gunakan email atau NIY beserta password Anda.`.

- [ ] **Step 2: Update login heading and helper copy**

In `src/app/auth/login/page.tsx`, replace:

```tsx
<h1 className="text-[28px] font-semibold tracking-normal text-foreground">
  Masuk
</h1>
<p className="text-sm leading-relaxed text-muted-foreground">
  Gunakan email atau NIY beserta password Anda.
</p>
```

with:

```tsx
<h1 className="text-[28px] font-semibold tracking-normal text-foreground">
  Assalamu&apos;alaikum warahmatullahi wabarakatuh
</h1>
<p className="text-sm leading-relaxed text-muted-foreground">
  Masuk dengan email atau NIY untuk melanjutkan ke Nurussunnah Hub.
</p>
```

Keep the submit button text as `Masuk`.

- [ ] **Step 3: Verify login copy text exists**

Run:

```powershell
rg -n "Assalamu|melanjutkan ke Nurussunnah Hub|Memproses|>Masuk<" src\app\auth\login\page.tsx
```

Expected: finds the new salam, the new helper copy, and the existing submit states.

- [ ] **Step 4: Commit login copy**

Run:

```powershell
git add src\app\auth\login\page.tsx
git commit -m "feat: add islamic login greeting"
```

Expected: commit succeeds.

## Task 2: Dashboard Salam Copy

**Files:**
- Modify: `src/components/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Confirm current dashboard greeting helper**

Run:

```powershell
rg -n "function greeting|Selamat pagi|Selamat siang|Selamat sore|Selamat malam|greeting\(\)" src\components\dashboard\dashboard-content.tsx
```

Expected: finds the time-based helper and its usage in the hero heading.

- [ ] **Step 2: Remove the time-based helper**

Delete this function from `src/components/dashboard/dashboard-content.tsx`:

```tsx
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}
```

- [ ] **Step 3: Update dashboard hero heading**

In `src/components/dashboard/dashboard-content.tsx`, replace:

```tsx
{greeting()}, {firstName}
```

with:

```tsx
Assalamu&apos;alaikum, {firstName}
```

Keep `const firstName = profile?.full_name?.split(" ")[0] ?? "Pengguna";` unchanged.

- [ ] **Step 4: Verify old greeting is gone and salam exists**

Run:

```powershell
rg -n "Assalamu|Selamat pagi|Selamat siang|Selamat sore|Selamat malam|greeting\(\)" src\components\dashboard\dashboard-content.tsx
```

Expected: finds `Assalamu&apos;alaikum, {firstName}` and no `Selamat ...` or `greeting()` matches.

- [ ] **Step 5: Commit dashboard copy**

Run:

```powershell
git add src\components\dashboard\dashboard-content.tsx
git commit -m "feat: add islamic dashboard greeting"
```

Expected: commit succeeds.

## Task 3: Verification

**Files:**
- No planned source edits unless verification exposes a defect.

- [ ] **Step 1: Run type check**

Run:

```powershell
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: exit code 0 and route summary printed.

- [ ] **Step 3: Check working tree**

Run:

```powershell
git status --short
```

Expected: no uncommitted files.

- [ ] **Step 4: Manual UI smoke**

Open the app and verify:

```text
/auth/login shows Assalamu'alaikum warahmatullahi wabarakatuh
/dashboard shows Assalamu'alaikum, <first name>
```

Expected: text renders without clipping on desktop and mobile widths.

## Self-Review Notes

- Spec coverage: login heading/helper, dashboard greeting replacement, unchanged auth/data/layout, and verification are covered.
- Scope: no visual motif, theme, auth, or data changes are included.
- Type consistency: only JSX copy and one unused helper removal are planned.

