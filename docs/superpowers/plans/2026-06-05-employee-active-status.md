# Employee Active Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed employee status model with separate `employee_status` and `active_status` enums across Supabase schema, generated types, HR UI, and active-employee logic.

**Architecture:** The database becomes the source of truth with two enum columns on `profiles`: `employee_status` for employment category and `active_status` for lifecycle state. Application code reads shared status option constants, writes both enum fields through employee server actions, and treats only `active_status = 'AKTIF'` as active for eligibility, dashboards, and access checks.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres, Supabase JS, server actions, existing shadcn/base UI components.

---

## File Structure

- Create: `supabase/migrations/019_employee_active_statuses.sql`
  - Adds `active_status_enum`, migrates `profiles.is_active` into `profiles.active_status`, replaces old `employee_status_enum` values, updates feedback/login SQL functions and indexes.
- Create: `src/lib/employee-status.ts`
  - Centralizes enum values, labels, options, guards, and badge helpers for employee and active statuses.
- Modify: `src/types/database.ts`
  - Reflects the new `profiles.active_status` column, removed `profiles.is_active`, new enum values, and aliases.
- Modify: `src/app/dashboard/employees/_components/employee-form-fields.tsx`
  - Replaces the active checkbox with an active status dropdown and updates employee status options.
- Modify: `src/app/dashboard/employees/actions.ts`
  - Validates status inputs, persists `active_status`, filters active home assignments by `active_status`, and changes deactivation to update only lifecycle status.
- Modify: `src/app/dashboard/employees/page.tsx`
  - Selects `active_status`, filters active/inactive views through lifecycle values, and counts active rows.
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`
  - Displays active status as primary badge and employee status as secondary label.
- Modify: `src/app/dashboard/employees/_components/employee-summary.tsx`
  - Displays both statuses through shared labels.
- Modify: `src/app/dashboard/employees/[id]/edit/page.tsx`
  - Selects `active_status` instead of `is_active`.
- Modify: `src/components/profile/profile-view.tsx`
  - Displays shared status labels and replaces status account row.
- Modify: `src/components/dashboard/dashboard-content.tsx`
  - Replaces local labels and profile active metric.
- Modify: `src/lib/auth/user-context.ts`
  - Returns `active_status` in profile context.
- Modify: `src/app/dashboard/layout.tsx`
  - Redirects users whose `active_status` is not `AKTIF`.
- Modify: `src/app/dashboard/page.tsx`
  - Replaces profile active/inactive queries with lifecycle-status queries.
- Modify: `src/app/dashboard/feedback/page.tsx`
  - Replaces active employee query with `active_status = 'AKTIF'`.
- Modify: `scripts/seed.mjs`
  - Seeds new employee statuses and active statuses.
- Modify: `docs/prd.md`
  - Replaces the stale `is_active` status note.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/019_employee_active_statuses.sql`

- [ ] **Step 1: Create the migration file with the schema and data migration**

Create `supabase/migrations/019_employee_active_statuses.sql` with this exact SQL:

```sql
-- Separate employment category from lifecycle status.

create type public.employee_status_enum_v2 as enum ('MAGANG', 'HONORER', 'CPTY', 'PTY');
create type public.active_status_enum as enum ('AKTIF', 'CUTI', 'NONAKTIF', 'RESIGN', 'DIBERHENTIKAN', 'PENSIUN');

alter table public.profiles
  add column active_status public.active_status_enum;

update public.profiles
set active_status = case
  when employee_status::text = 'PENSIUN' then 'PENSIUN'::public.active_status_enum
  when is_active then 'AKTIF'::public.active_status_enum
  else 'NONAKTIF'::public.active_status_enum
end;

alter table public.profiles
  alter column active_status set default 'AKTIF'::public.active_status_enum,
  alter column active_status set not null;

alter table public.profiles
  add column employee_status_new public.employee_status_enum_v2 default 'CPTY'::public.employee_status_enum_v2 not null;

update public.profiles
set employee_status_new = case employee_status::text
  when 'TETAP' then 'PTY'::public.employee_status_enum_v2
  when 'HONORER' then 'HONORER'::public.employee_status_enum_v2
  when 'TIDAK_TETAP' then 'CPTY'::public.employee_status_enum_v2
  when 'KONTRAK' then 'CPTY'::public.employee_status_enum_v2
  when 'PENSIUN' then 'PTY'::public.employee_status_enum_v2
  else 'CPTY'::public.employee_status_enum_v2
end;

drop index if exists public.idx_profiles_is_active;
drop index if exists public.idx_profiles_scope_feedback;

alter table public.profiles drop column employee_status;
alter table public.profiles rename column employee_status_new to employee_status;
alter table public.profiles drop column is_active;

drop type public.employee_status_enum;
alter type public.employee_status_enum_v2 rename to employee_status_enum;

create index idx_profiles_active_status on public.profiles(active_status);
create index idx_profiles_scope_feedback on public.profiles(home_unit_id, active_status, employee_status);

create or replace function public.get_feedback_targets(p_academic_year_id uuid)
returns table(
  receiver_user_id uuid,
  full_name text,
  employee_no text,
  unit_name text,
  unit_code text,
  rating integer,
  feedback_text text,
  is_completed boolean,
  feedback_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    target.id as receiver_user_id,
    target.full_name,
    target.employee_no,
    u.name as unit_name,
    u.code as unit_code,
    pf.rating,
    pf.feedback_text,
    coalesce(pf.is_completed, false) as is_completed,
    pf.id as feedback_id
  from public.profiles target
  left join public.units u on u.id = target.home_unit_id
  left join public.peer_feedbacks pf
    on pf.receiver_user_id = target.id
    and pf.giver_user_id = auth.uid()
    and pf.academic_year_id = p_academic_year_id
  where target.id <> auth.uid()
    and target.active_status = 'AKTIF'
  order by target.full_name;
$$;

create or replace function public.get_feedback_monitoring(p_academic_year_id uuid)
returns table(
  user_id uuid,
  full_name text,
  employee_no text,
  unit_name text,
  unit_code text,
  target_count bigint,
  completed_count bigint,
  is_complete boolean
)
language sql
security definer
set search_path = public
as $$
  with active_profiles as (
    select p.id, p.full_name, p.employee_no, p.home_unit_id
    from public.profiles p
    where p.active_status = 'AKTIF'
  )
  select
    giver.id as user_id,
    giver.full_name,
    giver.employee_no,
    u.name as unit_name,
    u.code as unit_code,
    count(target.id) as target_count,
    count(pf.id) filter (where pf.is_completed) as completed_count,
    count(target.id) = count(pf.id) filter (where pf.is_completed) as is_complete
  from active_profiles giver
  left join active_profiles target on target.id <> giver.id
  left join public.units u on u.id = giver.home_unit_id
  left join public.peer_feedbacks pf
    on pf.giver_user_id = giver.id
    and pf.receiver_user_id = target.id
    and pf.academic_year_id = p_academic_year_id
  group by giver.id, giver.full_name, giver.employee_no, u.name, u.code
  order by giver.full_name;
$$;

create or replace function public.get_feedback_monitoring_scoped(p_academic_year_id uuid)
returns table(
  user_id uuid,
  full_name text,
  employee_no text,
  unit_name text,
  unit_code text,
  target_count bigint,
  completed_count bigint,
  is_complete boolean
)
language sql
security definer
set search_path = public
as $$
  with my_units as (
    select distinct unit_id
    from public.user_unit_assignments
    where user_id = auth.uid()
      and assignment_type = 'HOME'
      and unit_id is not null
    union
    select home_unit_id
    from public.profiles
    where id = auth.uid()
      and home_unit_id is not null
  ), active_profiles as (
    select p.id, p.full_name, p.employee_no, p.home_unit_id
    from public.profiles p
    where p.active_status = 'AKTIF'
      and p.home_unit_id in (select unit_id from my_units)
  )
  select
    giver.id as user_id,
    giver.full_name,
    giver.employee_no,
    u.name as unit_name,
    u.code as unit_code,
    count(target.id) as target_count,
    count(pf.id) filter (where pf.is_completed) as completed_count,
    count(target.id) = count(pf.id) filter (where pf.is_completed) as is_complete
  from active_profiles giver
  left join active_profiles target on target.id <> giver.id
  left join public.units u on u.id = giver.home_unit_id
  left join public.peer_feedbacks pf
    on pf.giver_user_id = giver.id
    and pf.receiver_user_id = target.id
    and pf.academic_year_id = p_academic_year_id
  group by giver.id, giver.full_name, giver.employee_no, u.name, u.code
  order by giver.full_name;
$$;

create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.email) = lower(trim(p_identifier))
     or p.employee_no = regexp_replace(upper(trim(p_identifier)), '\s+', '', 'g')
    and p.active_status = 'AKTIF'
  order by p.created_at asc
  limit 1;
$$;
```

- [ ] **Step 2: Fix `resolve_login_email` precedence before applying**

Replace the final `where` block in `resolve_login_email` with the parenthesized version below so both email and NIY login require active status:

```sql
  where (
    lower(p.email) = lower(trim(p_identifier))
    or p.employee_no = regexp_replace(upper(trim(p_identifier)), '\s+', '', 'g')
  )
  and p.active_status = 'AKTIF'
```

- [ ] **Step 3: Run a local SQL syntax check if `psql` is available**

Run:

```powershell
psql --version
```

Expected if installed: exits 0 and prints a version. If missing, skip this syntax-only check and rely on Supabase execution in the verification task.

- [ ] **Step 4: Commit the migration**

Run:

```powershell
git add supabase/migrations/019_employee_active_statuses.sql
git commit -m "feat: split employee lifecycle statuses"
```

Expected: commit succeeds with one migration file.

---

### Task 2: Shared Status Constants and Types

**Files:**
- Create: `src/lib/employee-status.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write the type-level failing check**

Run:

```powershell
npx tsc --noEmit
```

Expected before implementation: TypeScript still passes or fails on existing unrelated generated-type encoding comments, but there is no `ActiveStatus` alias and no `active_status` field on `Profile` yet.

- [ ] **Step 2: Create shared status constants**

Create `src/lib/employee-status.ts`:

```ts
import type { ActiveStatus, EmployeeStatus } from "@/types/database";

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "MAGANG", label: "Magang" },
  { value: "HONORER", label: "Honorer" },
  { value: "CPTY", label: "Calon Pegawai Tetap Yayasan" },
  { value: "PTY", label: "Pegawai Tetap Yayasan" },
] as const satisfies readonly { value: EmployeeStatus; label: string }[];

export const ACTIVE_STATUS_OPTIONS = [
  { value: "AKTIF", label: "Aktif" },
  { value: "CUTI", label: "Cuti" },
  { value: "NONAKTIF", label: "Nonaktif" },
  { value: "RESIGN", label: "Resign" },
  { value: "DIBERHENTIKAN", label: "Diberhentikan" },
  { value: "PENSIUN", label: "Pensiun" },
] as const satisfies readonly { value: ActiveStatus; label: string }[];

export const EMPLOYEE_STATUS_LABELS = Object.fromEntries(
  EMPLOYEE_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<EmployeeStatus, string>;

export const ACTIVE_STATUS_LABELS = Object.fromEntries(
  ACTIVE_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<ActiveStatus, string>;

export function isEmployeeStatus(value: string): value is EmployeeStatus {
  return EMPLOYEE_STATUS_OPTIONS.some((option) => option.value === value);
}

export function isActiveStatus(value: string): value is ActiveStatus {
  return ACTIVE_STATUS_OPTIONS.some((option) => option.value === value);
}

export function activeStatusBadgeVariant(status: ActiveStatus) {
  return status === "AKTIF" ? "default" : "secondary";
}
```

- [ ] **Step 3: Update generated database types manually**

Edit `src/types/database.ts` so `profiles.Row` contains `active_status` and no `is_active`:

```ts
active_status: Database["public"]["Enums"]["active_status_enum"]
employee_status: Database["public"]["Enums"]["employee_status_enum"]
```

Edit `profiles.Insert` and `profiles.Update` similarly:

```ts
active_status?: Database["public"]["Enums"]["active_status_enum"]
employee_status?: Database["public"]["Enums"]["employee_status_enum"]
```

Edit `Database["public"]["Enums"]`:

```ts
active_status_enum: "AKTIF" | "CUTI" | "NONAKTIF" | "RESIGN" | "DIBERHENTIKAN" | "PENSIUN"
employee_status_enum: "MAGANG" | "HONORER" | "CPTY" | "PTY"
```

Add the alias near the existing aliases:

```ts
export type ActiveStatus = Database["public"]["Enums"]["active_status_enum"]
export type EmployeeStatus = Database["public"]["Enums"]["employee_status_enum"]
```

Keep `academic_years.is_active` and `units.is_active` unchanged.

- [ ] **Step 4: Run typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: fails only at call sites that still reference `profiles.is_active` or old employee status values. Those failures drive the next tasks.

- [ ] **Step 5: Commit constants and types**

Run:

```powershell
git add src/lib/employee-status.ts src/types/database.ts
git commit -m "feat: add employee status constants"
```

Expected: commit succeeds.

---

### Task 3: Employee Forms and Server Actions

**Files:**
- Modify: `src/app/dashboard/employees/_components/employee-form-fields.tsx`
- Modify: `src/app/dashboard/employees/actions.ts`
- Modify: `src/app/dashboard/employees/[id]/edit/page.tsx`

- [ ] **Step 1: Run typecheck to capture current form/action failures**

Run:

```powershell
npx tsc --noEmit
```

Expected: failures mention `is_active` fields, old employee status literals, or missing `active_status`.

- [ ] **Step 2: Update employee form fields**

In `src/app/dashboard/employees/_components/employee-form-fields.tsx`, import options:

```ts
import { ACTIVE_STATUS_OPTIONS, EMPLOYEE_STATUS_OPTIONS } from "@/lib/employee-status";
```

Update `EmployeeFormValue`:

```ts
employee_status?: string | null;
active_status?: string | null;
```

Replace the current status select and checkbox block with:

```tsx
<SelectField label="Status Pegawai" name="employee_status" defaultValue={employee?.employee_status ?? "CPTY"}>
  {EMPLOYEE_STATUS_OPTIONS.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</SelectField>
<SelectField
  label="Status Aktif"
  name="active_status"
  defaultValue={employee?.active_status ?? "AKTIF"}
  helper="Status ini menentukan apakah pegawai dihitung sebagai pegawai aktif sistem."
>
  {ACTIVE_STATUS_OPTIONS.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</SelectField>
```

Remove the old `CheckboxField` usage for `Pegawai Aktif` from this section. Keep `CheckboxField` because role checkboxes still use it.

- [ ] **Step 3: Update employee actions validation and payload**

In `src/app/dashboard/employees/actions.ts`, update imports:

```ts
import { isActiveStatus, isEmployeeStatus } from '@/lib/employee-status';
import type { ActiveStatus, EmployeeStatus, UserRoleEnum } from '@/types/database';
```

Add helpers after `nullableDate`:

```ts
function employeeStatus(formData: FormData): EmployeeStatus {
  const value = text(formData, 'employee_status');
  return isEmployeeStatus(value) ? value : 'CPTY';
}

function activeStatus(formData: FormData): ActiveStatus {
  const value = text(formData, 'active_status');
  return isActiveStatus(value) ? value : 'AKTIF';
}
```

Update `profilePayload` status fields:

```ts
employee_status: employeeStatus(formData),
active_status: activeStatus(formData),
```

Remove this line from the payload:

```ts
is_active: formData.get('is_active') === 'on',
```

Update `syncHomeAssignment` active-year query only if the current TypeScript edit accidentally changes academic-year `is_active`; it must remain:

```ts
.eq('is_active', true)
```

Update `deactivateEmployeeAction` write:

```ts
.update({ active_status: 'NONAKTIF' })
```

- [ ] **Step 4: Update edit page selection**

In `src/app/dashboard/employees/[id]/edit/page.tsx`, replace `is_active` in the profiles select string with `active_status`:

```ts
.select("id, full_name, employee_no, email, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, active_status, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)")
```

- [ ] **Step 5: Run typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: remaining failures are outside employee form/actions or point to table/page/profile display updates.

- [ ] **Step 6: Commit employee form/actions**

Run:

```powershell
git add src/app/dashboard/employees/_components/employee-form-fields.tsx src/app/dashboard/employees/actions.ts src/app/dashboard/employees/[id]/edit/page.tsx
git commit -m "feat: update employee status form actions"
```

Expected: commit succeeds.

---

### Task 4: Employee Directory Display and Filtering

**Files:**
- Modify: `src/app/dashboard/employees/page.tsx`
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`
- Modify: `src/app/dashboard/employees/_components/employee-summary.tsx`

- [ ] **Step 1: Update employee page row type and query**

In `src/app/dashboard/employees/page.tsx`, replace row field:

```ts
active_status: string;
```

Replace the profiles select string segment:

```ts
employee_status, active_status, must_change_password
```

Keep surrounding selected fields unchanged.

Replace active filter logic:

```ts
if (active === "active") query = query.eq("active_status", "AKTIF");
if (active === "inactive") query = query.neq("active_status", "AKTIF");
```

Replace active count:

```ts
const activeCount = rows.filter((row) => row.active_status === "AKTIF").length;
```

- [ ] **Step 2: Update employee table display**

In `src/app/dashboard/employees/employee-directory-table.tsx`, import helpers:

```ts
import {
  ACTIVE_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  activeStatusBadgeVariant,
} from "@/lib/employee-status";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";
```

Update `EmployeeRow`:

```ts
employee_status: EmployeeStatus;
active_status: ActiveStatus;
```

Replace the status cell content with:

```tsx
<div className="flex flex-col gap-1">
  <Badge variant={activeStatusBadgeVariant(row.active_status)} className="w-fit">
    {ACTIVE_STATUS_LABELS[row.active_status]}
  </Badge>
  <span className="text-xs text-muted-foreground">
    {EMPLOYEE_STATUS_LABELS[row.employee_status]}
  </span>
</div>
```

Update dialog description:

```tsx
{employee.full_name} akan ditandai Nonaktif. Riwayat data tetap disimpan.
```

Remove the local `statusLabel` function from this file.

- [ ] **Step 3: Update employee summary display**

In `src/app/dashboard/employees/_components/employee-summary.tsx`, import:

```ts
import { ACTIVE_STATUS_LABELS, EMPLOYEE_STATUS_LABELS, activeStatusBadgeVariant } from "@/lib/employee-status";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";
```

Update prop type:

```ts
employee_status: EmployeeStatus;
active_status: ActiveStatus;
```

Replace badges:

```tsx
<Badge variant={activeStatusBadgeVariant(employee.active_status)}>
  {ACTIVE_STATUS_LABELS[employee.active_status]}
</Badge>
<Badge variant="outline">{EMPLOYEE_STATUS_LABELS[employee.employee_status]}</Badge>
```

Remove the local `statusLabel` function.

- [ ] **Step 4: Run typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: employee directory files no longer report `is_active` or old status literal errors.

- [ ] **Step 5: Commit directory display**

Run:

```powershell
git add src/app/dashboard/employees/page.tsx src/app/dashboard/employees/employee-directory-table.tsx src/app/dashboard/employees/_components/employee-summary.tsx
git commit -m "feat: show employee lifecycle statuses"
```

Expected: commit succeeds.

---

### Task 5: Profile, Dashboard Context, and Access Checks

**Files:**
- Modify: `src/lib/auth/user-context.ts`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/components/profile/profile-view.tsx`
- Modify: `src/components/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Update user context**

In `src/lib/auth/user-context.ts`, replace profile type field:

```ts
active_status: string;
```

Replace the profiles select string:

```ts
"id, full_name, avatar_url, employee_status, active_status, home_unit_id, must_change_password, units!profiles_home_unit_id_fkey(id, name, code)"
```

- [ ] **Step 2: Update dashboard access redirect**

In `src/app/dashboard/layout.tsx`, replace the active check:

```ts
if (context.profile && context.profile.active_status !== "AKTIF") redirect("/auth/logout");
```

- [ ] **Step 3: Update profile view labels**

In `src/components/profile/profile-view.tsx`, replace local `EMPLOYEE_STATUS_LABELS` with imports:

```ts
import { ACTIVE_STATUS_LABELS, EMPLOYEE_STATUS_LABELS, activeStatusBadgeVariant } from "@/lib/employee-status";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";
```

Use typed profile status fields where the component defines profile shape:

```ts
employee_status: EmployeeStatus;
active_status: ActiveStatus;
```

Replace active badge logic:

```tsx
<Badge variant={activeStatusBadgeVariant(profile.active_status)}>
  {ACTIVE_STATUS_LABELS[profile.active_status]}
</Badge>
```

Replace `Status Akun` row:

```tsx
<Row label="Status Aktif" value={ACTIVE_STATUS_LABELS[profile.active_status]} />
```

- [ ] **Step 4: Update dashboard content labels**

In `src/components/dashboard/dashboard-content.tsx`, remove local employee labels and import:

```ts
import { ACTIVE_STATUS_LABELS, EMPLOYEE_STATUS_LABELS } from "@/lib/employee-status";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";
```

Update profile type:

```ts
employee_status: EmployeeStatus;
active_status: ActiveStatus;
```

Replace metric:

```tsx
<Metric label="Status" value={profile ? ACTIVE_STATUS_LABELS[profile.active_status] : "-"} />
```

Keep employee category rendering through:

```tsx
{profile?.employee_status ? EMPLOYEE_STATUS_LABELS[profile.employee_status] : "-"}
```

- [ ] **Step 5: Run typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: no remaining profile/context `is_active` errors.

- [ ] **Step 6: Commit context and profile updates**

Run:

```powershell
git add src/lib/auth/user-context.ts src/app/dashboard/layout.tsx src/components/profile/profile-view.tsx src/components/dashboard/dashboard-content.tsx
git commit -m "feat: use active status in profile context"
```

Expected: commit succeeds.

---

### Task 6: Dashboard, Feedback, Seed, and Documentation References

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/feedback/page.tsx`
- Modify: `scripts/seed.mjs`
- Modify: `docs/prd.md`

- [ ] **Step 1: Update dashboard page active profile queries**

In `src/app/dashboard/page.tsx`, replace profile queries that mean employee active status:

```ts
.eq("active_status", "AKTIF")
```

Replace inactive employee count query:

```ts
.neq("active_status", "AKTIF")
```

Do not change `academic_years.is_active` queries.

- [ ] **Step 2: Update feedback page active profile query**

In `src/app/dashboard/feedback/page.tsx`, replace:

```ts
.eq("is_active", true)
```

with:

```ts
.eq("active_status", "AKTIF")
```

- [ ] **Step 3: Update seed statuses**

In `scripts/seed.mjs`, replace seeded profile status values:

```js
employee_status: "PTY",
active_status: "AKTIF",
```

For the existing row that uses `TIDAK_TETAP`, use:

```js
employee_status: "CPTY",
active_status: "AKTIF",
```

Do not alter academic year or unit `is_active` values.

- [ ] **Step 4: Update stale PRD note**

In `docs/prd.md`, replace:

```md
- Mapping status aktif -> `is_active`.
```

with:

```md
- Mapping status aktif -> `profiles.active_status`.
```

If the file contains a Unicode arrow instead of `->`, replace that line with the same ASCII text above.

- [ ] **Step 5: Search for stale profile status references**

Run:

```powershell
rg -n "profiles.*is_active|\.eq\(\"is_active\"|\.eq\('is_active'|employee_status <> 'PENSIUN'|TIDAK_TETAP|KONTRAK|\"TETAP\"|\"PENSIUN\"" src scripts docs supabase/migrations/019_employee_active_statuses.sql
```

Expected: no matches for profile `is_active`, old employee status literals, or `employee_status <> 'PENSIUN'`. Matches for `academic_years.is_active` and `units.is_active` are acceptable only outside profile queries.

- [ ] **Step 6: Run typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: TypeScript passes.

- [ ] **Step 7: Commit remaining app references**

Run:

```powershell
git add src/app/dashboard/page.tsx src/app/dashboard/feedback/page.tsx scripts/seed.mjs docs/prd.md
git commit -m "feat: update active employee queries"
```

Expected: commit succeeds.

---

### Task 7: Verification and Build

**Files:**
- Verify only; no planned edits.

- [ ] **Step 1: Apply migration to the target Supabase database**

Preferred during implementation with Supabase MCP:

```sql
select count(*) from public.profiles;
```

Then apply `supabase/migrations/019_employee_active_statuses.sql` through the approved migration path for this project.

Expected: migration succeeds. `profiles` has `active_status`, has no `is_active`, and `employee_status` enum accepts only `MAGANG`, `HONORER`, `CPTY`, `PTY`.

- [ ] **Step 2: Verify migrated data mapping**

Run this SQL after migration:

```sql
select employee_status, active_status, count(*)
from public.profiles
group by employee_status, active_status
order by employee_status, active_status;
```

Expected: no old employee values appear. Rows with old `PENSIUN` now show `employee_status = 'PTY'` and `active_status = 'PENSIUN'`.

- [ ] **Step 3: Verify function filters**

Run:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_feedback_targets', 'get_feedback_monitoring', 'get_feedback_monitoring_scoped', 'resolve_login_email')
order by routine_name;
```

Expected: all four function names return.

- [ ] **Step 4: Run final stale-reference search**

Run:

```powershell
rg -n "profiles.*is_active|employee_status <> 'PENSIUN'|TIDAK_TETAP|KONTRAK|\"TETAP\"|\"PENSIUN\"|is_active\?: boolean|is_active: boolean" src scripts docs supabase/migrations/019_employee_active_statuses.sql
```

Expected: no matches tied to `profiles`. Matches in older historical migration files are acceptable if the search scope includes migrations before `019`.

- [ ] **Step 5: Run typecheck and build**

Run:

```powershell
npx tsc --noEmit
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit verification fixes if any were required**

If verification required edits, run:

```powershell
git status --short
```

Expected: no output if no edits were needed. If verification produced edits, commit the explicitly listed files from `git status --short` with message `fix: complete employee active status migration`.

---

## Self-Review Notes

- Spec coverage: database enum split, `is_active` replacement, migration mapping, UI dropdowns, lifecycle-only deactivation, active employee logic, shared labels, and verification are covered by Tasks 1 through 7.
- Placeholder scan: this plan contains no unresolved product decisions and no placeholder work items.
- Type consistency: `EmployeeStatus` and `ActiveStatus` are defined in Task 2 before usage in Tasks 3 through 6. `active_status` consistently replaces only `profiles.is_active`; `units.is_active` and `academic_years.is_active` remain unchanged.

