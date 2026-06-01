# App Settings Config Design

Date: 2026-06-01
Project: Nurussunnah Hub

## Context

The current `/dashboard/settings` page is only a link hub to pages that already exist in the sidebar. It should become a real Admin configuration surface backed by Supabase, so operational toggles and template text can be changed without code edits.

## Goals

1. Add durable application settings stored in Supabase.
2. Replace duplicated Settings links with useful configuration tabs.
3. Let Admin update workflow, document, and feedback settings from the UI.
4. Integrate first settings into existing surat and feedback flows.
5. Keep the first batch small enough to verify safely.

## Non-Goals

- No email/cron reminder automation in this batch.
- No redesign of existing sidebar or dashboard layout.
- No advanced import wizard in this batch.
- No rewrite of feedback target generation RPC in this batch.

## Data Model

Create `public.app_settings`:

- `key text primary key`
- `value jsonb not null`
- `description text`
- `is_public boolean default false not null`
- `updated_by uuid references auth.users(id)`
- `updated_at timestamptz default now() not null`

RLS:

- Admin can select/insert/update all settings.
- HRD can select operational settings.
- Other roles do not need direct table access; server components/actions read settings as needed.

Seed keys:

- `work_statement_enabled`: boolean
- `work_statement_submit_deadline`: date string or null
- `feedback_enabled`: boolean
- `feedback_submit_deadline`: date string or null
- `work_statement_default_commitment`: text
- `work_statement_footer_note`: text
- `feedback_text_required`: boolean
- `feedback_min_rating`: number 1-5

## Settings UI

Replace the link cards in `/dashboard/settings` with tabs:

- `Workflow`: surat enabled, surat deadline, feedback enabled, feedback deadline.
- `Dokumen`: default commitment text and footer note for printed work statements.
- `Feedback`: feedback text required and minimum rating.
- `Keamanan & Audit`: read-only checklist/status for leaked password protection, Supabase advisors, and audit-log count.

The UI remains Admin-only. It should use existing shadcn/ui components and current dashboard styling.

## Integration

### Work Statements

- `/dashboard/work-statements` reads settings.
- If `work_statement_enabled` is false, the form is disabled and explains the period is not open.
- Submit action rejects submit after `work_statement_submit_deadline` when set.
- New drafts use `work_statement_default_commitment` as the commitment placeholder/default when no statement exists.
- Print page shows `work_statement_footer_note` when set.

### Feedback

- `/dashboard/feedback` reads settings.
- If `feedback_enabled` is false, feedback target forms are disabled and explain the period is not open.
- Submit action rejects submit after `feedback_submit_deadline` when set.
- Submit action rejects empty feedback text when `feedback_text_required` is true.
- Submit action rejects rating lower than `feedback_min_rating`.

## Architecture

Add a focused helper module `src/lib/app-settings.ts` that provides:

- `getAppSettings()` for server components/actions.
- typed defaults when a key is absent.
- small coercion helpers for boolean, date, number, and text values.

Settings writes stay in `src/app/dashboard/settings/actions.ts`. The action should whitelist known keys, validate values, update `updated_by`, and revalidate settings plus affected workflow routes.

## Verification

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`
- Supabase advisor check after migration.
- Manual smoke:
  - Admin can update each settings tab.
  - Surat form closes when disabled.
  - Surat submit rejects after deadline.
  - Feedback form closes when disabled.
  - Feedback submit enforces required text and minimum rating.

## Acceptance Criteria

- Settings page no longer duplicates sidebar links.
- Settings persist in Supabase and survive reload.
- Admin can edit settings from the UI.
- Surat and feedback flows respect enabled flags and deadlines.
- Document text settings appear in the relevant surat UI/print flow.
- Existing role access remains intact.
