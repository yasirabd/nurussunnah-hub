# Leave No-Evidence Checkbox Clears Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear and suppress leave evidence files whenever the user acknowledges that no physical evidence exists.

**Architecture:** Add controlled checkbox state and a synchronous clear handler in the leave form, then add authoritative filtering in the Server Action. Source-level regression tests cover both browser behavior and server-side suppression without changing database or Drive contracts.

**Tech Stack:** React 19, Next.js 16 Server Actions, TypeScript, Node test runner.

---

### Task 1: Regression Test and Form Behavior

**Files:**
- Modify: `tests/attendance-correction-upload.test.mjs`
- Modify: `src/app/dashboard/leave-requests/_components/leave-request-form.tsx`

- [ ] **Step 1: Write the failing form regression test**

Add a test that reads the leave form source and asserts:

```js
test("no-evidence acknowledgement clears and disables leave evidence", () => {
  const leaveForm = readFileSync(
    "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
    "utf8"
  );

  assert.match(leaveForm, /const \[noEvidenceAck, setNoEvidenceAck\] = useState\(false\)/);
  assert.match(leaveForm, /function handleNoEvidenceAck/);
  assert.match(leaveForm, /leaveEvidenceRef\.current\.value = ""/);
  assert.match(leaveForm, /disabled=\{isPreparingEvidence \|\| \(!evidenceRequired && noEvidenceAck\)\}/);
  assert.match(leaveForm, /checked=\{noEvidenceAck\}/);
  assert.match(leaveForm, /onChange=\{\(event\) => handleNoEvidenceAck\(event\.target\.checked\)\}/);
});
```

- [ ] **Step 2: Run the targeted test and confirm RED**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: FAIL because the checkbox is uncontrolled and no clear handler exists.

- [ ] **Step 3: Implement controlled clearing behavior**

Add state and the clear handler inside `LeaveRequestForm`:

```ts
const [noEvidenceAck, setNoEvidenceAck] = useState(false);

function handleNoEvidenceAck(checked: boolean) {
  setNoEvidenceAck(checked);
  if (checked && leaveEvidenceRef.current) {
    leaveEvidenceRef.current.value = "";
    setEvidenceMessage("");
  }
}
```

Update `bukti_izin`:

```tsx
disabled={isPreparingEvidence || (!evidenceRequired && noEvidenceAck)}
```

Update the checkbox:

```tsx
<input
  type="checkbox"
  name="no_evidence_ack"
  className="mt-0.5"
  checked={noEvidenceAck}
  onChange={(event) => handleNoEvidenceAck(event.target.checked)}
/>
```

- [ ] **Step 4: Run the targeted test**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: form behavior assertions pass; the server suppression assertion from Task 2 remains pending.

### Task 2: Server-Side Evidence Suppression

**Files:**
- Modify: `tests/attendance-correction-upload.test.mjs`
- Modify: `src/app/dashboard/leave-requests/actions.ts`

- [ ] **Step 1: Add the failing Server Action assertion**

Extend the regression test with:

```js
const leaveAction = readFileSync("src/app/dashboard/leave-requests/actions.ts", "utf8");
assert.match(leaveAction, /const noEvidenceAck = text\(formData, "no_evidence_ack"\) === "on"/);
assert.match(leaveAction, /const evidence = noEvidenceAck\s*\? \[\]\s*:\s*formData/);
```

- [ ] **Step 2: Run the targeted test and confirm RED**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: FAIL because the action currently reads evidence independently of the checkbox.

- [ ] **Step 3: Reuse one authoritative checkbox value**

Before the RPC call, add:

```ts
const noEvidenceAck = text(formData, "no_evidence_ack") === "on";
```

Pass it to the RPC:

```ts
p_no_evidence_ack: noEvidenceAck,
```

Suppress stale evidence files:

```ts
const evidence = noEvidenceAck
  ? []
  : formData
      .getAll("bukti_izin")
      .filter((file): file is File => file instanceof File && file.size > 0);
```

- [ ] **Step 4: Run targeted and complete verification**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: all targeted tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build:cloudflare`

Expected: exit code 0.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/app/dashboard/leave-requests/_components/leave-request-form.tsx src/app/dashboard/leave-requests/actions.ts tests/attendance-correction-upload.test.mjs docs/superpowers/plans/2026-07-26-leave-no-evidence-clears-upload.md
git commit -m "fix: clear acknowledged leave evidence"
```
