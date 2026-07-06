# Attendance Correction Checkbox UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the correction time dropdown with Masuk/Pulang checkboxes so employees naturally submit one combined correction when both times are missing.

**Architecture:** Keep the database and RPC unchanged. Add a small pure mapper for checkbox values to the existing enum, use it in the server action, and update the form/history UI.

**Tech Stack:** Next.js App Router, React client component, server actions, Supabase RPC, Node assert self-check.

---

## File Structure

- Modify `src/app/dashboard/attendance-corrections/actions.ts`: derive `time_scope` from submitted checkbox values before calling the RPC.
- Modify `src/app/dashboard/attendance-corrections/_components/correction-form.tsx`: replace native `time_scope` dropdown with `time_parts` checkboxes and rename the cause label.
- Modify `src/app/dashboard/attendance-corrections/page.tsx`: reuse detailed time label in `Koreksi Saya`.
- Create `tests/attendance-correction-time-scope.test.mjs`: self-check mapping behavior without a browser test framework.

### Task 1: Add Time Scope Mapper

**Files:**
- Modify: `src/app/dashboard/attendance-corrections/actions.ts`
- Create: `tests/attendance-correction-time-scope.test.mjs`

- [ ] **Step 1: Write the self-check**

Create `tests/attendance-correction-time-scope.test.mjs`:

```js
import assert from "node:assert/strict";

function deriveTimeScope(parts) {
  const values = new Set(parts);
  const hasIn = values.has("MASUK");
  const hasOut = values.has("PULANG");
  if (hasIn && hasOut) return "KEDUANYA";
  if (hasIn) return "MASUK";
  if (hasOut) return "PULANG";
  return "";
}

assert.equal(deriveTimeScope(["MASUK"]), "MASUK");
assert.equal(deriveTimeScope(["PULANG"]), "PULANG");
assert.equal(deriveTimeScope(["MASUK", "PULANG"]), "KEDUANYA");
assert.equal(deriveTimeScope(["PULANG", "MASUK"]), "KEDUANYA");
assert.equal(deriveTimeScope([]), "");
assert.equal(deriveTimeScope(["MASUK", "MASUK"]), "MASUK");
assert.equal(deriveTimeScope(["BAD"]), "");
```

- [ ] **Step 2: Run self-check**

Run: `node tests/attendance-correction-time-scope.test.mjs`

Expected: exit code `0`.

- [ ] **Step 3: Add mapper to server action**

In `src/app/dashboard/attendance-corrections/actions.ts`, add:

```ts
function deriveTimeScope(fd: FormData) {
  const values = new Set(fd.getAll("time_parts").map((v) => String(v)));
  const hasIn = values.has("MASUK");
  const hasOut = values.has("PULANG");
  if (hasIn && hasOut) return "KEDUANYA";
  if (hasIn) return "MASUK";
  if (hasOut) return "PULANG";
  return "";
}
```

Then replace the RPC `p_time_scope` value with:

```ts
const timeScope = deriveTimeScope(formData);
if (!timeScope) redirectWith(false, "Pilih presensi yang perlu dikoreksi.", "ajukan");
```

and:

```ts
p_time_scope: timeScope as Database["public"]["Enums"]["attendance_time_scope_enum"],
```

- [ ] **Step 4: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: no TypeScript errors from changed files.

### Task 2: Update Form and History UI

**Files:**
- Modify: `src/app/dashboard/attendance-corrections/_components/correction-form.tsx`
- Modify: `src/app/dashboard/attendance-corrections/page.tsx`

- [ ] **Step 1: Replace dropdown state with checkbox state**

In `correction-form.tsx`, replace:

```ts
const [timeScope, setTimeScope] = useState("");
const needsCheckIn = timeScope === "MASUK" || timeScope === "KEDUANYA";
const needsCheckOut = timeScope === "PULANG" || timeScope === "KEDUANYA";
```

with:

```ts
const [timeParts, setTimeParts] = useState<string[]>([]);
const needsCheckIn = timeParts.includes("MASUK");
const needsCheckOut = timeParts.includes("PULANG");

function toggleTimePart(value: "MASUK" | "PULANG", checked: boolean) {
  setTimeParts((current) =>
    checked ? Array.from(new Set([...current, value])) : current.filter((v) => v !== value)
  );
}
```

- [ ] **Step 2: Replace the time dropdown JSX**

Replace the `<select id="time_scope" ...>` block with:

```tsx
<div className="space-y-2">
  <Label>Presensi yang tidak tercatat</Label>
  <div className="grid gap-2 sm:grid-cols-2">
    {[
      { value: "MASUK", label: "Masuk" },
      { value: "PULANG", label: "Pulang" },
    ].map((option) => (
      <label
        key={option.value}
        className="flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm"
      >
        <input
          type="checkbox"
          name="time_parts"
          value={option.value}
          checked={timeParts.includes(option.value)}
          onChange={(e) => toggleTimePart(option.value as "MASUK" | "PULANG", e.target.checked)}
          className="size-4"
        />
        <span>{option.label}</span>
      </label>
    ))}
  </div>
  <p className="text-xs text-muted-foreground">
    Jika tidak membawa kartu/lupa tap seharian, centang Masuk dan Pulang.
  </p>
</div>
```

- [ ] **Step 3: Rename cause label**

Change:

```tsx
<Label htmlFor="correction_kind">Jenis Koreksi Presensi</Label>
```

to:

```tsx
<Label htmlFor="correction_kind">Penyebab presensi tidak tercatat</Label>
```

- [ ] **Step 4: Update history time display**

In `page.tsx` inside `MyHistory`, replace:

```tsx
<TableCell>{SCOPE_LABEL[r.time_scope]}</TableCell>
```

with:

```tsx
<TableCell>{correctionTimeLabel(r)}</TableCell>
```

- [ ] **Step 5: Verify**

Run:

```bash
node tests/attendance-correction-time-scope.test.mjs
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/dashboard/attendance-corrections/actions.ts src/app/dashboard/attendance-corrections/_components/correction-form.tsx src/app/dashboard/attendance-corrections/page.tsx tests/attendance-correction-time-scope.test.mjs docs/superpowers/plans/2026-07-06-attendance-correction-checkbox-ux.md
git commit -m "feat: improve attendance correction time selection"
```

