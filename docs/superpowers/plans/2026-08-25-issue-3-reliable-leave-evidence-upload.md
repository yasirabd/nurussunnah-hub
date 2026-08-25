# Reliable Evidence Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reliably submit prepared leave and attendance-correction gallery images without depending on `DataTransfer`, while supporting safe original HEIC/HEIF/AVIF fallbacks.

**Architecture:** Detect supported image formats by signature, convert browser-decodable sources to JPEG, and fall back to valid original HEIC/HEIF/AVIF files when decoding is unavailable. Keep prepared files in form refs and inject them into `FormData` through client action wrappers. Apply the same server validation and attachment-insert error handling to leave and attendance correction.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, Node test runner, Supabase, Google Drive API

---

### Task 1: Define the failing reliable-upload contract

**Files:**
- Modify: `tests/attendance-correction-upload.test.mjs`
- Modify: `tests/leave-evidence-preparation.test.mjs`

- [ ] **Step 1: Add source-level assertions for opt-in JPEG conversion and actionable decode errors.**

Add assertions that `prepareEvidenceFiles` accepts `convertToJpeg`, that conversion forces browser decoding even below the optimization threshold, that output is `image/jpeg`, and that decode failure tells the user to choose JPG, PNG, or WebP.

- [ ] **Step 2: Add source-level assertions for prepared-file refs and the client FormData wrapper.**

Assert that the leave form has separate prepared refs for the unit-head screenshot and leave evidence, removes `replaceInputFiles`, uses `formData.set` for both fields, deletes acknowledged leave evidence, and passes the wrapper to `<form action={...}>`.

- [ ] **Step 3: Add server assertions for JPEG-only validation and checked attachment inserts.**

Assert that leave validation requests `allowedMimeTypes: ["image/jpeg"]`, the unit-head screenshot is required, and the attachment insert result is checked and thrown on error.

- [ ] **Step 4: Run the focused tests and verify RED.**

Run: `node --test tests/attendance-correction-upload.test.mjs tests/leave-evidence-preparation.test.mjs`

Expected: FAIL because the current leave form still calls `replaceInputFiles`, the preparation utility has no JPEG-conversion option, and attachment insert errors are ignored.

### Task 2: Implement opt-in browser JPEG conversion

**Files:**
- Modify: `src/lib/evidence-upload-client.ts`

- [ ] **Step 1: Add `convertToJpeg?: boolean` to preparation options.**

Pass the option into `optimizeEvidenceImage` and decode when either conversion is requested or the existing size threshold requires optimization.

- [ ] **Step 2: Return the first within-limit JPEG when conversion is required.**

Allow a converted JPEG even when it is not smaller than its source, keep the existing smaller-file rule for other consumers, and preserve the `.jpg` filename and `image/jpeg` MIME type.

- [ ] **Step 3: Make unsupported-format errors actionable.**

Use: `Format foto tidak dapat diproses oleh browser. Pilih atau konversi foto ke JPG, PNG, atau WebP.`

- [ ] **Step 4: Run the focused tests.**

Run: `node --test tests/attendance-correction-upload.test.mjs tests/leave-evidence-preparation.test.mjs`

Expected: preparation assertions pass while form/action assertions remain RED.

### Task 3: Submit prepared leave files as the source of truth

**Files:**
- Modify: `src/app/dashboard/leave-requests/_components/leave-request-form.tsx`

- [ ] **Step 1: Replace native-file mutation with two prepared-file refs.**

Create `unitHeadPreparedEvidenceRef` and `leavePreparedEvidenceRef`. Store the prepared result according to `input.name`; clear the relevant ref when selection is removed or preparation fails.

- [ ] **Step 2: Add the client action wrapper.**

Before invoking `submitLeaveRequestAction`, delete each native evidence entry and set it again only from its prepared ref. If `noEvidenceAck` is checked, omit `bukti_izin`.

- [ ] **Step 3: Preserve no-evidence and required-category behavior.**

Clear the leave prepared ref when acknowledgement is checked. Reset the acknowledgement when category or multi-day state makes evidence required.

- [ ] **Step 4: Update help copy.**

State that gallery photos are converted to JPEG and unsupported formats may need manual conversion, while preserving the one-photo and 5 MB limit.

- [ ] **Step 5: Run the focused tests.**

Run: `node --test tests/attendance-correction-upload.test.mjs tests/leave-evidence-preparation.test.mjs`

Expected: client assertions pass while remaining server-action assertions stay RED.

### Task 4: Enforce prepared JPEG and surface attachment persistence failures

**Files:**
- Modify: `src/lib/evidence-upload-server.ts`
- Modify: `src/app/dashboard/leave-requests/actions.ts`

- [ ] **Step 1: Add optional validation settings.**

Support `required?: boolean` and `allowedMimeTypes?: readonly string[]` without changing existing callers. A missing required file produces `<label> wajib diunggah.` and a disallowed MIME type produces `<label> harus disiapkan sebagai foto JPG.`

- [ ] **Step 2: Apply the JPEG contract to leave evidence.**

Require the unit-head screenshot as prepared JPEG. Validate optional leave evidence as prepared JPEG unless the no-evidence acknowledgement is checked.

- [ ] **Step 3: Check attachment metadata persistence.**

Capture `{ error: attachmentError }` from `leave_request_attachments.insert(rows)` and throw a concise error when it is present. Keep the existing partial-success redirect, but do not expose the raw underlying error to the user.

- [ ] **Step 4: Run the focused tests and verify GREEN.**

Run: `node --test tests/attendance-correction-upload.test.mjs tests/leave-evidence-preparation.test.mjs`

Expected: PASS.

### Task 5: Verify the initial leave implementation

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run the required test suite.**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint.**

Run: `npm run lint`

Expected: zero lint errors.

- [ ] **Step 3: Run the production build.**

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 4: Review repository state.**

Run: `git diff --check`, inspect the focused diff, and confirm no deploy, migration, or production-data files changed.

- [ ] **Step 5: Commit the initial leave implementation.**

Commit the initial leave implementation before extending the same contract to attendance correction.

### Task 6: Extend the contract to safe original mobile formats and attendance correction

**Files:**
- Create: `src/lib/evidence-file.mjs`
- Modify: `src/lib/evidence-upload-client.ts`
- Modify: `src/lib/evidence-upload-server.ts`
- Modify: `src/app/dashboard/attendance-corrections/_components/correction-form.tsx`
- Modify: `src/app/dashboard/attendance-corrections/actions.ts`
- Modify: `src/app/dashboard/leave-requests/actions.ts`
- Modify: `tests/attendance-correction-upload.test.mjs`
- Modify: `tests/leave-evidence-rules.test.mjs`

- [ ] **Step 1: Add failing behavioral tests for JPEG, PNG, WebP, GIF, BMP, AVIF, HEIC, and HEIF signature detection plus original-fallback eligibility.**
- [ ] **Step 2: Add failing assertions that attendance correction uses a prepared-file ref and client FormData wrapper instead of `DataTransfer`.**
- [ ] **Step 3: Implement shared signature detection and allow original fallback only for valid HEIC/HEIF/AVIF files at or below 5 MB.**
- [ ] **Step 4: Apply the prepared-file submission path to Attendance Correction.**
- [ ] **Step 5: Enforce MIME/signature validation and checked attachment inserts in both Server Actions.**
- [ ] **Step 6: Run focused tests, full tests, lint, build, diff review, code review, push, and PR creation.**
