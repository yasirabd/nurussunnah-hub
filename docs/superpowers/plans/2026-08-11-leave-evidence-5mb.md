# Leave Evidence 5 MB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit each leave-evidence file to 5 MB, automatically compress oversized images, and reject oversized PDFs or uncompressible images.

**Architecture:** Extend the shared evidence upload utility with deterministic per-file validation and iterative browser image encoding. Apply that utility to the leave form and add the same limit at the Server Action boundary before the leave request is persisted.

**Tech Stack:** Next.js 16, React 19, TypeScript, browser Canvas/File APIs, Node test runner

---

### Task 1: Define and test the per-file preparation policy

**Files:**
- Modify: `src/lib/attendance-correction-upload.mjs`
- Modify: `tests/attendance-correction-upload.test.mjs`

- [ ] **Step 1: Write failing tests for the 5 MB constant and compression attempts**

Add assertions that `EVIDENCE_MAX_FILE_BYTES` equals `5_000_000`, that files above it require size reduction, and that compression attempts progress from high-quality/larger dimensions toward smaller outputs.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: FAIL because the new constant and attempt helper are not exported.

- [ ] **Step 3: Implement the policy helpers**

Export `EVIDENCE_MAX_FILE_BYTES`, `isEvidenceFileWithinLimit(size, maxBytes)`, and `evidenceCompressionAttempts(width, height)`. Attempts must preserve aspect ratio and order candidates from best visual quality to strongest compression.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: PASS.

### Task 2: Compress every oversized image below the per-file limit

**Files:**
- Modify: `src/lib/evidence-upload-client.ts`
- Modify: `tests/attendance-correction-upload.test.mjs`

- [ ] **Step 1: Write a failing source integration test**

Assert that the client utility iterates over `evidenceCompressionAttempts`, checks each generated blob against `EVIDENCE_MAX_FILE_BYTES`, returns the first successful candidate, and throws when no candidate fits.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: FAIL because image optimization still performs one fixed encoding.

- [ ] **Step 3: Implement iterative browser compression**

Decode the image once, render each candidate size to canvas, encode at the candidate JPEG quality, and return the first blob at or below 5 MB. Keep images already within 5 MB unchanged. Throw a filename-specific Indonesian error if all attempts fail.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: PASS.

### Task 3: Enforce and explain the limit in the leave form

**Files:**
- Modify: `src/app/dashboard/leave-requests/_components/leave-request-form.tsx`
- Modify: `tests/leave-evidence-preparation.test.mjs`

- [ ] **Step 1: Write failing tests for per-file checks and helper text**

Assert that every prepared file is checked against `EVIDENCE_MAX_FILE_BYTES`, that no 10 MB combined check remains in the leave form, and that both fields mention a maximum of 5 MB per file plus automatic photo compression.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/leave-evidence-preparation.test.mjs`

Expected: FAIL because the form still validates a 10 MB combined total.

- [ ] **Step 3: Implement the form behavior**

Replace the combined-total validation with per-file validation. Reject a PDF over 5 MB with a filename-specific message, clear the input on failure, retain preparation locking, and update both helper texts.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/leave-evidence-preparation.test.mjs`

Expected: PASS.

### Task 4: Add server-side defense before persistence

**Files:**
- Modify: `src/app/dashboard/leave-requests/actions.ts`
- Modify: `tests/leave-evidence-preparation.test.mjs`

- [ ] **Step 1: Write a failing test for validation order**

Assert that both attachment groups are read and passed through a 5 MB validator before `supabase.rpc("submit_leave_request")`, and that an oversized file redirects with an actionable message.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/leave-evidence-preparation.test.mjs`

Expected: FAIL because the action currently persists the request before inspecting attachment sizes.

- [ ] **Step 3: Implement server-side validation**

Extract valid files and validate each file size immediately after authorization and approval checks. Redirect to the submission tab when any file exceeds 5 MB. Reuse the already validated arrays after the RPC so the files are not parsed twice.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/leave-evidence-preparation.test.mjs`

Expected: PASS.

### Task 5: Verify the complete change

**Files:**
- Verify all modified source and test files

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: all tests pass without failures.

- [ ] **Step 2: Run static verification**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check` and `git diff --stat`

Expected: no whitespace errors and only scoped files are changed.

