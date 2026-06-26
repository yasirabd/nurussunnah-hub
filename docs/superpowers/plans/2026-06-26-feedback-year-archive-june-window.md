# Feedback Year Archive June Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add year selection for peer feedback archives and lock feedback submission to 1 June 00:00 through 30 June 23:59 WIB for the active academic year.

**Architecture:** Keep the existing feedback route and RPCs. The server page chooses a selected academic year from query params, reads all feedback data for that year, and passes a computed write-lock state into the client carousel. The database RPC enforces the same active-year and June-WIB rules so direct submits cannot bypass the UI.

**Tech Stack:** Next.js App Router, React Server Components, Supabase RPC/Postgres, Node test runner.

---

## File Structure

- Create: `tests/feedback-window.test.mjs`
  - Tests date-window behavior independently from the app runtime.
- Modify: `src/lib/timezone.ts`
  - Add pure helpers for WIB month extraction and feedback submission window.
- Modify: `src/app/dashboard/feedback/page.tsx`
  - Add academic-year selector, selected-year data flow, status badge, and write lock.
- Modify: `src/app/dashboard/feedback/feedback-target-carousel.tsx`
  - Accept `canSubmitFeedback` and `lockedMessage`; render locked card instead of submit form.
- Modify: `supabase/migrations/025_feedback_archive_june_window.sql`
  - Add Postgres helper and update `submit_peer_feedback` guard.

## Task 1: Date Helper Test

**Files:**
- Create: `tests/feedback-window.test.mjs`

- [ ] **Step 1: Write failing date-window tests**

Create `tests/feedback-window.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

function isFeedbackSubmissionOpenWIB(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(value.month) === 6;
}

test("feedback submission window opens on 1 June 00:00 WIB", () => {
  assert.equal(isFeedbackSubmissionOpenWIB(new Date("2026-05-31T16:59:59.000Z")), false);
  assert.equal(isFeedbackSubmissionOpenWIB(new Date("2026-05-31T17:00:00.000Z")), true);
});

test("feedback submission window closes after 30 June 23:59 WIB", () => {
  assert.equal(isFeedbackSubmissionOpenWIB(new Date("2026-06-30T16:59:59.000Z")), true);
  assert.equal(isFeedbackSubmissionOpenWIB(new Date("2026-06-30T17:00:00.000Z")), false);
});
```

- [ ] **Step 2: Run test to verify baseline**

Run: `npm test -- tests/feedback-window.test.mjs`

Expected: PASS for the local pure copy. This confirms the expected boundary values before app helper wiring.

## Task 2: App Time Helper

**Files:**
- Modify: `src/lib/timezone.ts`
- Modify: `tests/feedback-window.test.mjs`

- [ ] **Step 1: Add app helper**

Add to `src/lib/timezone.ts`:

```ts
export function getWIBDateParts(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function isFeedbackSubmissionOpenWIB(value: Date = new Date()) {
  return getWIBDateParts(value).month === 6;
}
```

- [ ] **Step 2: Keep Node test as a boundary guard**

Leave `tests/feedback-window.test.mjs` pure JS because the repo has no TS test transpiler. The test remains a boundary contract matching the app helper logic.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: all Node tests PASS.

## Task 3: Feedback Page Year Selector

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Load academic years and selected year**

Replace active-year-only query with:

```ts
  const { data: yearsData } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, is_active")
    .order("start_date", { ascending: false });

  const academicYears = yearsData ?? [];
  const activeYear = academicYears.find((year) => year.is_active) ?? null;
  const requestedYearId = paramValue(params, "year");
  const selectedYear =
    academicYears.find((year) => year.id === requestedYearId) ?? activeYear;
```

- [ ] **Step 2: Use selected year in RPC calls**

Change every `activeYear.id` RPC argument to `selectedYear.id`. Keep `activeYear` only for active/default status checks.

- [ ] **Step 3: Add write-lock state**

Import helper:

```ts
import { formatDateTimeWIB, isFeedbackSubmissionOpenWIB } from "@/lib/timezone";
```

Compute:

```ts
  const isSelectedActiveYear = Boolean(
    selectedYear && activeYear && selectedYear.id === activeYear.id
  );
  const isJuneWindowOpen = isFeedbackSubmissionOpenWIB();
  const canSubmitFeedback = isSelectedActiveYear && isJuneWindowOpen;
  const feedbackLockMessage = !selectedYear
    ? "Tahun pelajaran belum tersedia."
    : !isSelectedActiveYear
      ? "Tahun pelajaran ini adalah arsip. Anda hanya dapat melihat feedback yang diterima."
      : !isJuneWindowOpen
        ? "Pengisian feedback hanya dibuka pada bulan Juni."
        : "";
```

- [ ] **Step 4: Add year selector form**

Add near header actions:

```tsx
<form action="/dashboard/feedback" className="flex items-center gap-2">
  <select
    name="year"
    defaultValue={selectedYear?.id ?? ""}
    className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
  >
    {academicYears.map((year) => (
      <option key={year.id} value={year.id}>
        {year.name}
      </option>
    ))}
  </select>
  <button className="h-10 rounded-[var(--radius-full)] bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
    Pilih
  </button>
</form>
```

- [ ] **Step 5: Display selected year and status**

Use `selectedYear` for the year badge. Add status badge text:

```ts
const periodStatus = canSubmitFeedback
  ? "Periode pengisian dibuka"
  : isSelectedActiveYear
    ? "Periode pengisian ditutup"
    : "Arsip tahun pelajaran";
```

- [ ] **Step 6: Preserve `year` in filter hidden fields**

Include `year: selectedYear?.id ?? ""` in `hiddenFields` passed to monitoring and identified filters.

## Task 4: Locked Carousel UI

**Files:**
- Modify: `src/app/dashboard/feedback/feedback-target-carousel.tsx`

- [ ] **Step 1: Extend props**

Add props:

```ts
  canSubmitFeedback = true,
  lockedMessage = "Pengisian feedback sedang ditutup.",
```

Update type:

```ts
  canSubmitFeedback?: boolean;
  lockedMessage?: string;
```

- [ ] **Step 2: Render locked card**

Before `<FeedbackTargetCard />`, branch:

```tsx
{canSubmitFeedback ? (
  <FeedbackTargetCard
    key={activeTarget.receiver_user_id}
    target={activeTarget}
    academicYearId={academicYearId}
    isMultiUnit={isMultiUnit}
  />
) : (
  <div className="rounded-[var(--radius-md)] border bg-secondary/50 px-4 py-6 text-sm text-muted-foreground">
    {lockedMessage}
  </div>
)}
```

- [ ] **Step 3: Pass lock props from page**

In `page.tsx`:

```tsx
<FeedbackTargetCarousel
  targets={targets}
  academicYearId={selectedYear.id}
  isMultiUnit={isMultiUnit}
  canSubmitFeedback={canSubmitFeedback}
  lockedMessage={feedbackLockMessage}
/>
```

## Task 5: Database Guard

**Files:**
- Create: `supabase/migrations/025_feedback_archive_june_window.sql`

- [ ] **Step 1: Create migration**

Create migration file with:

```sql
-- ============================================================
-- MIGRATION 025: Feedback archive selection and June submit lock
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_feedback_submission_open()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta')) = 6;
$$;

REVOKE EXECUTE ON FUNCTION public.is_feedback_submission_open() FROM public;
GRANT EXECUTE ON FUNCTION public.is_feedback_submission_open() TO authenticated;
```

- [ ] **Step 2: Replace `submit_peer_feedback`**

Copy the current function body and insert these guards after rating validation:

```sql
  IF NOT EXISTS (
    SELECT 1
    FROM public.academic_years ay
    WHERE ay.id = p_academic_year_id
      AND ay.is_active = true
  ) THEN
    RAISE EXCEPTION 'Feedback hanya dapat diisi untuk tahun pelajaran aktif.';
  END IF;

  IF NOT public.is_feedback_submission_open() THEN
    RAISE EXCEPTION 'Pengisian feedback hanya dibuka pada bulan Juni.';
  END IF;
```

- [ ] **Step 3: Preserve execute grants**

End migration with:

```sql
REVOKE EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(UUID, UUID, INTEGER, TEXT) TO authenticated;
```

## Task 6: Verification

**Files:**
- Verify only

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: no TypeScript errors.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: build exits 0.

- [ ] **Step 4: Review changed files**

Run: `git diff -- src/lib/timezone.ts src/app/dashboard/feedback/page.tsx src/app/dashboard/feedback/feedback-target-carousel.tsx supabase/migrations/025_feedback_archive_june_window.sql tests/feedback-window.test.mjs`

Expected: only planned changes.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add src/lib/timezone.ts src/app/dashboard/feedback/page.tsx src/app/dashboard/feedback/feedback-target-carousel.tsx supabase/migrations/025_feedback_archive_june_window.sql tests/feedback-window.test.mjs
git commit -m "feat: add feedback archive year selection"
```
