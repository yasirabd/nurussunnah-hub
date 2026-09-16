# Peraturan & SK Yayasan Implementation Plan

> Execute inline with superpowers:executing-plans; implementation authorized by the user.

**Goal:** Publish general employee rules as private PDFs with immutable publication history.
**Architecture:** Supabase table, private bucket and protected transactional RPCs; Next.js server actions and authenticated document pages. Reuse existing authentication and UI.
**Tech Stack:** Next.js, React, Supabase, Node test runner.
**Spec:** `docs/superpowers/specs/2026-09-16-peraturan-sk-yayasan-design.md`

## Constraints

PDF only, maximum 10 MiB. HRD/Admin manage; employees with Hub access read published/archive only. Publication requires an effective date no later than today in Asia/Jakarta. Replacement and archival must commit together. No overwrites of published PDFs. No read tracking.

## Tasks

- [x] 1. Add behavioral validation tests in `tests/policy-documents.test.mjs`, observe failure, implement `src/lib/policy-documents.mjs` and its type declaration. Cover invalid metadata, Jakarta date boundary, PDF signature/MIME/size and invalid IDs.
- [x] 2. Add `supabase/migrations/043_policy_documents.sql` and database types. Revoke direct mutations; allow authenticated reads through RLS. Save drafts and publish/archive through role-checked RPCs; row locks serialize replacement. Storage writes use server credentials after validation. Add runnable SQL transaction tests for roles and lifecycle.
- [x] 3. Add `src/app/dashboard/policies` list/detail pages, draft form, server actions, authenticated file endpoint, and PDF reader. Reuse feature guard and active-profile checks. Surface errors, pending states, empty lists, search/category filters and archives. Add navigation item shared by desktop/mobile.
- [x] 4. Run focused tests, SQL checks where a local database is available, TypeScript, lint and build. Verify desktop/mobile reader. Record deployment migration and any verification limits in the spec.

## Verification commands

```powershell
node --test tests/policy-documents.test.mjs
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Baseline: 201 tests passed before implementation. Work on `codex/peraturan-sk-yayasan` in the existing workspace; no unrelated files changed.

Outcome: 206 tests passed; disposable PostgreSQL/PGlite checks and desktop/mobile PDF checks passed. TypeScript, feature-file lint, Next.js production build and Cloudflare bundle passed. Global lint still includes pre-existing generated-file and kebersihan errors. The user applied migration 043 through Supabase SQL Editor; read-only live checks confirmed the columns, private PDF bucket, size/MIME limits, and denied anonymous table access. Application deployment and live upload/publication smoke testing remain. See the spec for verification limits and deployment prerequisites.
