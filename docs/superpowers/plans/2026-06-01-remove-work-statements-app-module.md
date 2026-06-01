# Remove Work Statements App Module Implementation Plan

Goal: remove Surat Pernyataan Kerja from app UI and routes while keeping Supabase DB artifacts intact.

Architecture: app-only removal. Edit sidebar, dashboard, dashboard data query, docs. Delete route/action/print files. Do not touch migrations, generated database types, RPCs, RLS, or storage history.

Tech stack: Next.js App Router, TypeScript, React, Supabase client.

Task 1: remove entry points.
- [ ] In src/components/layout/app-sidebar.tsx, remove FileText import and Surat Kerja nav item.
- [ ] In src/components/dashboard/dashboard-content.tsx, remove workStatementStatus prop, work statement action card, FileText import, and statementStatusLabel helper.
- [ ] In src/app/dashboard/page.tsx, remove work_statements query and workStatementStatus prop wiring.
- [ ] Run: rg -n "dashboard/work-statements|Surat Kerja|workStatementStatus|statementStatusLabel" src
- [ ] Expected: no output.

Task 2: delete module files.
- [ ] Delete src/app/dashboard/work-statements/page.tsx.
- [ ] Delete src/app/dashboard/work-statements/actions.ts.
- [ ] Delete src/app/dashboard/work-statements/[id]/print/page.tsx.
- [ ] Delete src/components/work-statements/print-button.tsx.
- [ ] Run: rg --files src | rg "work-statements"
- [ ] Expected: no output.

Task 3: document.
- [ ] Add 1 Juni 2026 revision-log entry explaining app module removal and retained Supabase artifacts.
- [ ] Run: rg -n "1 Juni 2026|artifact Supabase" docs/revision-log.md
- [ ] Expected: new entry lines.

Task 4: verify and commit.
- [ ] Run: npx tsc --noEmit --incremental false
- [ ] Run: npm run lint
- [ ] Run: npm run build
- [ ] Run: rg -n "work-statements|Surat Kerja|workStatementStatus|PrintButton" src
- [ ] Expected: verification exits 0 and final search has no output.
- [ ] Commit: chore: remove work statements app module
