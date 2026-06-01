# Feedback Unit Scope Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make feedback targets and Kepala Unit monitoring resolve same-unit peers from active HOME unit assignments, with profile unit data kept in sync.

**Architecture:** Add a focused SQL migration that backfills `profiles.home_unit_id` and replaces feedback RPCs with effective-unit CTEs. Update the existing employee profile server action to sync active-year HOME assignment whenever HRD/Admin changes the profile unit.

**Tech Stack:** Next.js App Router server actions, Supabase Postgres migrations/RPC, TypeScript.

---

## File Structure

- Modify: `supabase/migrations/013_feedback_effective_unit_scope.sql` - new migration containing data backfill and RPC replacements.
- Modify: `src/app/dashboard/employees/actions.ts` - sync `user_unit_assignments` with profile home unit edits.
- Verify: Supabase SQL queries through MCP and `npx tsc --noEmit`.

### Task 1: Add Database Migration

**Files:**
- Create: `supabase/migrations/013_feedback_effective_unit_scope.sql`

- [ ] **Step 1: Write the failing SQL verification query**

Run in Supabase SQL before migration:

```sql
with active_year as (
  select id from public.academic_years where is_active = true limit 1
), effective_units as (
  select p.employee_no, coalesce(home_assignment.unit_id, p.home_unit_id) as effective_unit_id
  from public.profiles p
  left join public.user_unit_assignments home_assignment
    on home_assignment.user_id = p.id
   and home_assignment.assignment_type = 'HOME'
   and home_assignment.academic_year_id = (select id from active_year)
  where p.employee_no in ('SD001', 'SD002', 'SD003')
)
select count(*) as sd_effective_count
from effective_units eu
join public.units u on u.id = eu.effective_unit_id
where u.code = 'SD';
```

Expected before migration: `sd_effective_count = 3`, proving assignments already identify the SD group while `profiles.home_unit_id` remains null.

- [ ] **Step 2: Create migration file**

Add `supabase/migrations/013_feedback_effective_unit_scope.sql`:

```sql
-- Backfill profile home unit from active-year HOME assignment.
WITH active_year AS (
  SELECT id
  FROM public.academic_years
  WHERE is_active = true
  ORDER BY start_date DESC
  LIMIT 1
), preferred_home AS (
  SELECT DISTINCT ON (uua.user_id)
    uua.user_id,
    uua.unit_id
  FROM public.user_unit_assignments uua
  JOIN active_year ay ON ay.id = uua.academic_year_id
  WHERE uua.assignment_type = 'HOME'
  ORDER BY uua.user_id, uua.created_at DESC
)
UPDATE public.profiles p
SET home_unit_id = preferred_home.unit_id
FROM preferred_home
WHERE p.id = preferred_home.user_id
  AND p.home_unit_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_feedback_targets(p_academic_year_id UUID)
RETURNS TABLE (
  receiver_user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  unit_code TEXT,
  rating INTEGER,
  feedback_text TEXT,
  is_completed BOOLEAN,
  feedback_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_profile AS (
    SELECT p.id, p.home_unit_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.employee_status <> 'PENSIUN'
  ), my_units AS (
    SELECT DISTINCT uua.unit_id
    FROM public.user_unit_assignments uua
    JOIN my_profile mp ON mp.id = uua.user_id
    WHERE uua.assignment_type = 'HOME'
      AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    UNION
    SELECT home_unit_id
    FROM my_profile
    WHERE home_unit_id IS NOT NULL
  ), target_units AS (
    SELECT
      p.id AS user_id,
      COALESCE(home_assignment.unit_id, p.home_unit_id) AS unit_id
    FROM public.profiles p
    LEFT JOIN public.user_unit_assignments home_assignment
      ON home_assignment.user_id = p.id
     AND home_assignment.assignment_type = 'HOME'
     AND (home_assignment.academic_year_id = p_academic_year_id OR home_assignment.academic_year_id IS NULL)
    WHERE p.is_active = true
      AND p.employee_status <> 'PENSIUN'
  )
  SELECT DISTINCT ON (target.id)
    target.id AS receiver_user_id,
    target.full_name,
    target.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    pf.rating,
    pf.feedback_text,
    COALESCE(pf.is_completed, false) AS is_completed,
    pf.id AS feedback_id
  FROM public.profiles target
  JOIN target_units target_unit ON target_unit.user_id = target.id
  JOIN my_units my_unit ON my_unit.unit_id = target_unit.unit_id
  LEFT JOIN public.units u ON u.id = target_unit.unit_id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = auth.uid()
   AND pf.receiver_user_id = target.id
  WHERE target.id <> auth.uid()
    AND target.is_active = true
    AND target.employee_status <> 'PENSIUN'
  ORDER BY target.id, u.code, target.full_name;
$$;

CREATE OR REPLACE FUNCTION public.get_feedback_monitoring_scoped(p_academic_year_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  employee_no TEXT,
  unit_name TEXT,
  unit_code TEXT,
  target_count INTEGER,
  completed_count INTEGER,
  is_complete BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_units AS (
    SELECT uua.unit_id
    FROM public.user_unit_assignments uua
    WHERE uua.user_id = auth.uid()
      AND uua.assignment_type = 'HOME'
      AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    UNION
    SELECT p.home_unit_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.home_unit_id IS NOT NULL
  ), effective_profiles AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.full_name,
      p.employee_no,
      COALESCE(home_assignment.unit_id, p.home_unit_id) AS unit_id
    FROM public.profiles p
    LEFT JOIN public.user_unit_assignments home_assignment
      ON home_assignment.user_id = p.id
     AND home_assignment.assignment_type = 'HOME'
     AND (home_assignment.academic_year_id = p_academic_year_id OR home_assignment.academic_year_id IS NULL)
    WHERE p.is_active = true
      AND p.employee_status <> 'PENSIUN'
    ORDER BY p.id, home_assignment.academic_year_id NULLS LAST, home_assignment.created_at DESC
  )
  SELECT
    giver.id AS user_id,
    giver.full_name,
    giver.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    COUNT(receiver.id)::INTEGER AS target_count,
    COUNT(pf.id)::INTEGER AS completed_count,
    (COUNT(receiver.id) = COUNT(pf.id)) AS is_complete
  FROM effective_profiles giver
  LEFT JOIN public.units u ON u.id = giver.unit_id
  LEFT JOIN effective_profiles receiver
    ON receiver.unit_id = giver.unit_id
   AND receiver.id <> giver.id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = giver.id
   AND pf.receiver_user_id = receiver.id
   AND pf.is_completed = true
  WHERE public.is_hrd()
     OR public.is_admin()
     OR (public.is_kepala_unit() AND giver.unit_id IN (SELECT unit_id FROM my_units))
  GROUP BY giver.id, giver.full_name, giver.employee_no, u.name, u.code
  ORDER BY u.code, giver.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_targets(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_feedback_targets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) TO authenticated;
```

- [ ] **Step 3: Apply migration in Supabase**

Run the SQL with Supabase MCP `apply_migration` using migration name `feedback_effective_unit_scope`.

Expected: migration succeeds with no SQL errors.

- [ ] **Step 4: Verify data backfill**

Run:

```sql
select p.employee_no, u.code as home_unit_code
from public.profiles p
left join public.units u on u.id = p.home_unit_id
where p.employee_no in ('SD001', 'SD002', 'SD003')
order by p.employee_no;
```

Expected rows: `SD001 SD`, `SD002 SD`, `SD003 SD`.

### Task 2: Sync Profile Unit Edits

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Add active-year HOME assignment sync after profile update**

Change `updateEmployeeProfileAction` to store `homeUnitId`, update profile, then sync assignment only if profile update succeeds:

```ts
export async function updateEmployeeProfileAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const id = text(formData, 'id');
  const employeeNo = text(formData, 'employee_no').replace(/\s/g, '');
  const homeUnitId = text(formData, 'home_unit_id') || null;

  const { error } = await supabase.from('profiles').update({
    full_name: text(formData, 'full_name'),
    employee_no: employeeNo,
    email: text(formData, 'email'),
    phone: text(formData, 'phone') || null,
    employee_status: text(formData, 'employee_status') as EmployeeStatus,
    is_active: formData.get('is_active') === 'on',
    home_unit_id: homeUnitId,
  }).eq('id', id);

  if (error) {
    revalidatePath('/dashboard/employees');
    redirectWith(false, error.message);
  }

  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (activeYear?.id) {
    const { error: deleteAssignmentError } = await supabase
      .from('user_unit_assignments')
      .delete()
      .eq('user_id', id)
      .eq('assignment_type', 'HOME')
      .eq('academic_year_id', activeYear.id);

    if (deleteAssignmentError) {
      revalidatePath('/dashboard/employees');
      redirectWith(false, deleteAssignmentError.message);
    }

    if (homeUnitId) {
      const { error: insertAssignmentError } = await supabase
        .from('user_unit_assignments')
        .insert({
          user_id: id,
          unit_id: homeUnitId,
          assignment_type: 'HOME',
          academic_year_id: activeYear.id,
        });

      if (insertAssignmentError) {
        revalidatePath('/dashboard/employees');
        redirectWith(false, insertAssignmentError.message);
      }
    }
  }

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Data pegawai berhasil diperbarui.');
}
```

- [ ] **Step 2: Run TypeScript verification**

Run: `npx tsc --noEmit`

Expected: exits `0`.

### Task 3: Verify Feedback Scope End-to-End

**Files:**
- Verify only.

- [ ] **Step 1: Verify RPC source contains effective-unit logic**

Run:

```sql
select proname, pg_get_functiondef(oid) as definition
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('get_feedback_targets', 'get_feedback_monitoring_scoped');
```

Expected: both definitions include `user_unit_assignments` and `COALESCE(home_assignment.unit_id, p.home_unit_id)`.

- [ ] **Step 2: Verify SD target set through equivalent RPC logic**

Run:

```sql
with active_year as (
  select id from public.academic_years where is_active = true limit 1
), giver as (
  select id from public.profiles where employee_no = 'SD001'
), my_units as (
  select distinct uua.unit_id
  from public.user_unit_assignments uua
  join giver g on g.id = uua.user_id
  where uua.assignment_type = 'HOME'
    and uua.academic_year_id = (select id from active_year)
), target_units as (
  select p.id, p.employee_no, coalesce(home_assignment.unit_id, p.home_unit_id) as unit_id
  from public.profiles p
  left join public.user_unit_assignments home_assignment
    on home_assignment.user_id = p.id
   and home_assignment.assignment_type = 'HOME'
   and home_assignment.academic_year_id = (select id from active_year)
  where p.is_active = true and p.employee_status <> 'PENSIUN'
)
select target_units.employee_no
from target_units
join my_units on my_units.unit_id = target_units.unit_id
where target_units.id <> (select id from giver)
order by target_units.employee_no;
```

Expected includes `SD002` and `SD003`.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add supabase/migrations/013_feedback_effective_unit_scope.sql src/app/dashboard/employees/actions.ts docs/superpowers/plans/2026-06-01-feedback-unit-scope-fix.md
git commit -m "fix: resolve feedback scope from unit assignments"
```

Expected: commit succeeds.
