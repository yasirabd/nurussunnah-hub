# Attendance Correction Optional Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the attendance correction note optional while preserving the existing non-null database contract.

**Architecture:** Change only the correction form UI and add a source-level regression test. The existing Server Action continues normalizing a missing form value to an empty string, so no RPC or migration change is needed.

**Tech Stack:** React 19, Next.js 16 Server Actions, TypeScript, Node test runner.

---

### Task 1: Optional Correction Note

**Files:**
- Modify: `tests/attendance-correction-upload.test.mjs`
- Modify: `src/app/dashboard/attendance-corrections/_components/correction-form.tsx`

- [ ] **Step 1: Write the failing regression test**

Add this test to `tests/attendance-correction-upload.test.mjs`:

```js
test("attendance correction note is optional", () => {
  const correctionForm = readFileSync(
    "src/app/dashboard/attendance-corrections/_components/correction-form.tsx",
    "utf8"
  );

  assert.match(correctionForm, /Keterangan \(Opsional\)/);
  assert.match(
    correctionForm,
    /<Textarea id="reason" name="reason" rows=\{4\}/
  );
  assert.doesNotMatch(
    correctionForm,
    /<Textarea id="reason" name="reason" required/
  );
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: FAIL because the current label is `Keterangan` and the textarea is still required.

- [ ] **Step 3: Implement the optional field UI**

Replace the correction note block with:

```tsx
<div className="space-y-1.5">
  <Label htmlFor="reason">Keterangan (Opsional)</Label>
  <Textarea
    id="reason"
    name="reason"
    rows={4}
    placeholder="Tambahkan keterangan jika ada informasi lain yang perlu disampaikan."
  />
  <p className="text-xs text-muted-foreground">
    Isi jika ada konteks tambahan yang perlu diketahui admin.
  </p>
</div>
```

- [ ] **Step 4: Run the targeted test and confirm GREEN**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: all upload and correction form tests pass.

- [ ] **Step 5: Run complete verification**

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/dashboard/attendance-corrections/_components/correction-form.tsx tests/attendance-correction-upload.test.mjs docs/superpowers/plans/2026-07-26-attendance-correction-optional-note.md
git commit -m "fix: make correction note optional"
```
