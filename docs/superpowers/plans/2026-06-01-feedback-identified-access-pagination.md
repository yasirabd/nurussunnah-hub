# Feedback Identified Access Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Feedback Teridentifikasi as a paginated table for HRD/Admin only, while Kepala Unit keeps monitoring access without fetching or seeing identified feedback.

**Architecture:** The existing Feedback Rekan page stays as one server component. Split role flags in `src/app/dashboard/feedback/page.tsx`, gate the identified RPC and identified UI on `canViewIdentified`, and preserve the existing table/pagination helpers.

**Tech Stack:** Next.js App Router server components, TypeScript, Supabase RPC, Tailwind/shadcn table components.

---

## File Structure

- Modify `src/app/dashboard/feedback/page.tsx`: split role flags, gate `get_feedback_identified`, gate identified filtering/pagination/UI, keep monitoring under `canMonitor`.
- No migration needed: `supabase/migrations/007_fase3_feedback_workflow.sql` already restricts `get_feedback_identified` with `WHERE (public.is_hrd() OR public.is_admin())`.
- No new component file: pagination/table helpers already exist in the page.

## Current Workspace Note

`src/app/dashboard/feedback/page.tsx` is already modified in the working tree from prior feedback-page scalability work. Do not revert those changes. When committing implementation, stage only the small hunks from this plan or leave the file uncommitted if partial staging is not practical.

## Task 1: Split Role Flags and Gate Identified Fetch

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Confirm RPC SQL access guard**

Run:

```powershell
Get-Content -LiteralPath supabase\migrations\007_fase3_feedback_workflow.sql | Select-Object -Skip 190 -First 40
```

Expected: `get_feedback_identified` contains `WHERE (public.is_hrd() OR public.is_admin())`. No migration is created.

- [ ] **Step 2: Split role flags**

Replace:

```ts
  const roles = (rolesData ?? []).map((item) => item.role);
  const canMonitor = roles.includes("HRD") || roles.includes("ADMIN") || roles.includes("KEPALA_UNIT");
```

with:

```ts
  const roles = (rolesData ?? []).map((item) => item.role);
  const canViewIdentified = roles.includes("HRD") || roles.includes("ADMIN");
  const canMonitor = canViewIdentified || roles.includes("KEPALA_UNIT");
```

- [ ] **Step 3: Gate identified RPC on HRD/Admin only**

Replace:

```ts
  const { data: identifiedData } =
    activeYear && canMonitor
      ? await supabase.rpc("get_feedback_identified", {
          p_academic_year_id: activeYear.id,
        })
      : { data: [] };
```

with:

```ts
  const { data: identifiedData } =
    activeYear && canViewIdentified
      ? await supabase.rpc("get_feedback_identified", {
          p_academic_year_id: activeYear.id,
        })
      : { data: [] };
```

- [ ] **Step 4: Run TypeScript**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code 0.

## Task 2: Gate Identified UI and URL Param Use

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Normalize identified query params for HRD/Admin only**

Replace:

```ts
  const identifiedUnit = paramValue(params, "identifiedUnit") ?? "all";
```

with:

```ts
  const identifiedUnit = canViewIdentified
    ? paramValue(params, "identifiedUnit") ?? "all"
    : "all";
```

Replace:

```ts
  const identifiedPage = clampPage(
    positivePage(paramValue(params, "identifiedPage")),
    filteredIdentified.length
  );
```

with:

```ts
  const identifiedPage = canViewIdentified
    ? clampPage(positivePage(paramValue(params, "identifiedPage")), filteredIdentified.length)
    : 1;
```

- [ ] **Step 2: Gate the Feedback Teridentifikasi card**

Find the `<Card>` whose title is `Feedback Teridentifikasi` inside the `{canMonitor && (...)}` section. Wrap only that card with:

```tsx
              {canViewIdentified && (
                <Card>
                  ...existing Feedback Teridentifikasi card content...
                </Card>
              )}
```

Keep `Pengingat Feedback` and `Monitoring Feedback` inside `canMonitor` and outside `canViewIdentified`.

- [ ] **Step 3: Preserve pagination controls**

Ensure the identified card still contains:

```tsx
                  <PaginationLinks
                    page={identifiedPage}
                    totalPages={identifiedTotalPages}
                    pageHref={(page) => buildFeedbackHref(params, { identifiedPage: page })}
                  />
```

Expected: HRD/Admin still see page summary and previous/next/page links below the table.

- [ ] **Step 4: Run TypeScript**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code 0.

## Task 3: Verify Build and Final State

**Files:**
- Verify: `src/app/dashboard/feedback/page.tsx`

- [ ] **Step 1: Run TypeScript**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run:

```powershell
cmd /c "npm run build > build-output.log 2>&1 & echo EXIT:%ERRORLEVEL%"
Remove-Item -LiteralPath build-output.log -Force
```

Expected: `EXIT:0`.

- [ ] **Step 3: Inspect role-gating code**

Run:

```powershell
rg -n "canViewIdentified|canMonitor|get_feedback_identified|Feedback Teridentifikasi" src\app\dashboard\feedback\page.tsx
```

Expected:

```text
canViewIdentified = roles.includes("HRD") || roles.includes("ADMIN")
canMonitor = canViewIdentified || roles.includes("KEPALA_UNIT")
get_feedback_identified fetch is gated by canViewIdentified
Feedback Teridentifikasi card is gated by canViewIdentified
```

- [ ] **Step 4: Commit only intended implementation hunks**

If partial staging is practical, stage only the hunks from Tasks 1-2 and commit:

```powershell
git add -p src\app\dashboard\feedback\page.tsx
git commit -m "fix: restrict identified feedback access"
```

If partial staging is not practical because the file already contains unrelated dirty changes, do not commit `src/app/dashboard/feedback/page.tsx`; report that implementation changes are present in the dirty file and list the exact role-gating edits.

## Self-Review

- Spec coverage: Task 1 prevents fetch for Kepala Unit, Task 2 hides UI and ignores params for Kepala Unit, existing pagination is preserved and verified in Task 3.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain.
- Type consistency: `canViewIdentified`, `canMonitor`, `identifiedUnit`, `identifiedPage`, and `PaginationLinks` names match the existing page code.
