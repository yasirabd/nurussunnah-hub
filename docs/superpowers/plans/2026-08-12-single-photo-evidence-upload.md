# Single-Photo Evidence Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit each attendance-correction and employee-leave evidence field to one image, reject PDF and manipulated multi-file requests on the server, and preserve clear partial-success messaging.

**Architecture:** Keep the existing client compression and database-first upload flow. Tighten the three file inputs in the UI, then introduce shared Server Action evidence validation so browser restrictions cannot be bypassed. Cover the behavior with source-level regression tests before changing production code.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, Node test runner, Supabase, Google Drive API

---

### Task 1: Add failing upload-contract tests

**Files:**
- Modify: `tests/attendance-correction-upload.test.mjs`

- [ ] **Step 1: Write tests asserting all three inputs accept only one image and Server Actions validate count, MIME type, and size before RPC calls.**
- [ ] **Step 2: Run `node --test tests/attendance-correction-upload.test.mjs` and confirm the new assertions fail against the current PDF/multi-file implementation.**

### Task 2: Implement shared server validation and single-photo UI

**Files:**
- Create: `src/lib/evidence-upload-server.ts`
- Modify: `src/app/dashboard/attendance-corrections/actions.ts`
- Modify: `src/app/dashboard/leave-requests/actions.ts`
- Modify: `src/app/dashboard/attendance-corrections/_components/correction-form.tsx`
- Modify: `src/app/dashboard/leave-requests/_components/leave-request-form.tsx`

- [ ] **Step 1: Add a server helper that reads non-empty files, rejects more than one file, rejects non-image MIME types, and rejects images over 5 MB using the existing shared constant.**
- [ ] **Step 2: Call the helper for `bukti`, `bukti_ss_kepala_unit`, and `bukti_izin` before either submit RPC is invoked. Preserve the no-evidence acknowledgement by skipping stale leave evidence when it is checked.**
- [ ] **Step 3: Change all inputs to `accept="image/*"`, remove `multiple`, and update help text to state `Maksimal 1 foto, 5 MB`.**
- [ ] **Step 4: Change partial-success errors to explicitly tell users not to submit again because the request record already exists.**
- [ ] **Step 5: Run `node --test tests/attendance-correction-upload.test.mjs` and confirm the focused tests pass.**

### Task 3: Verify the complete change

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run `npm test` and confirm zero failures.**
- [ ] **Step 2: Run `npx tsc --noEmit` and confirm zero type errors.**
- [ ] **Step 3: Run `npm run build` and confirm the production build succeeds.**
- [ ] **Step 4: Run `git diff --check` and inspect `git diff --stat` plus the focused diff for unintended changes.**
