# Feedback Rekan — Unit Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membatasi scope Feedback Rekan per unit, support multiple assignments, dengan security di level database.

**Architecture:** Perbaiki RPC `get_feedback_targets` dan `get_feedback_monitoring_scoped` --- ganti DISTINCT ON dengan EXISTS overlap multi-unit. Tambah badge unit di carousel frontend jika user multi-unit.

**Tech Stack:** PostgreSQL RPC (Supabase), Next.js Server Components + Client Components (React/TypeScript)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/024_feedback_multi_unit_overlap.sql` | Create | New migration: CREATE OR REPLACE kedua RPC |
| `src/app/dashboard/feedback/page.tsx` | Modify | Hitung `isMultiUnit` dari targets |
| `src/app/dashboard/feedback/feedback-target-carousel.tsx` | Modify | Render badge unit jika multi-unit |

---

### Task 1: Migration SQL --- `get_feedback_targets`

**Files:**
- Create: `supabase/migrations/024_feedback_multi_unit_overlap.sql`

- [ ] **Step 1: Tulis `get_feedback_targets` dengan EXISTS overlap**

```sql
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
  )
  SELECT DISTINCT
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
  LEFT JOIN public.units u ON u.id = target.home_unit_id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = auth.uid()
   AND pf.receiver_user_id = target.id
  WHERE target.id <> auth.uid()
    AND target.is_active = true
    AND target.employee_status <> 'PENSIUN'
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_unit_assignments target_uua
        WHERE target_uua.user_id = target.id
          AND target_uua.assignment_type = 'HOME'
          AND (target_uua.academic_year_id = p_academic_year_id OR target_uua.academic_year_id IS NULL)
          AND target_uua.unit_id IN (SELECT unit_id FROM my_units)
      )
      OR
      target.home_unit_id IN (SELECT unit_id FROM my_units)
    )
  ORDER BY u.code, target.full_name;
$$;
```

- [ ] **Step 2: Grant execute**

```sql
REVOKE EXECUTE ON FUNCTION public.get_feedback_targets(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_feedback_targets(UUID) TO authenticated;
```

### Task 2: Migration SQL --- `get_feedback_monitoring_scoped`

**Files:**
- Modify: `supabase/migrations/024_feedback_multi_unit_overlap.sql` (append after Task 1)

- [ ] **Step 1: Tulis `get_feedback_monitoring_scoped`**

```sql
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
  ), employee_units AS (
    SELECT
      p.id AS user_id,
      COALESCE(uua.unit_id, p.home_unit_id) AS unit_id
    FROM public.profiles p
    LEFT JOIN public.user_unit_assignments uua
      ON uua.user_id = p.id
     AND uua.assignment_type = 'HOME'
     AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
    WHERE p.is_active = true
      AND p.employee_status <> 'PENSIUN'
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.employee_no,
    u.name AS unit_name,
    u.code AS unit_code,
    COUNT(DISTINCT tu.user_id)::INTEGER AS target_count,
    COUNT(DISTINCT pf.id)::INTEGER AS completed_count,
    (COUNT(DISTINCT tu.user_id) = COUNT(DISTINCT pf.id)) AS is_complete
  FROM public.profiles p
  LEFT JOIN public.units u ON u.id = p.home_unit_id
  JOIN employee_units pu ON pu.user_id = p.id
  LEFT JOIN employee_units tu ON tu.unit_id = pu.unit_id AND tu.user_id <> p.id
  LEFT JOIN public.peer_feedbacks pf
    ON pf.academic_year_id = p_academic_year_id
   AND pf.giver_user_id = p.id
   AND pf.receiver_user_id = tu.user_id
   AND pf.is_completed = true
  WHERE p.is_active = true
    AND p.employee_status <> 'PENSIUN'
    AND (
      public.is_hrd()
      OR public.is_admin()
      OR (
        public.is_kepala_unit()
        AND EXISTS (
          SELECT 1 FROM employee_units eu
          WHERE eu.user_id = p.id AND eu.unit_id IN (SELECT unit_id FROM my_units)
        )
      )
    )
  GROUP BY p.id, p.full_name, p.employee_no, u.name, u.code
  ORDER BY u.code, p.full_name;
$$;
```

- [ ] **Step 2: Grant execute**

```sql
REVOKE EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_feedback_monitoring_scoped(UUID) TO authenticated;
```

### Task 3: Frontend --- Badge unit di carousel

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`
- Modify: `src/app/dashboard/feedback/feedback-target-carousel.tsx`

- [ ] **Step 1: Hitung `isMultiUnit` di page.tsx**

Setelah baris `const targets = (targetsResult.data ?? []) as FeedbackTarget[];` (line 189), tambah:

```tsx
  const distinctTargetUnits = new Set(targets.map((t) => t.unit_code).filter(Boolean));
  const isMultiUnit = distinctTargetUnits.size > 1;
```

Ubah prop `FeedbackTargetCarousel` (line 336) jadi:

```tsx
                <FeedbackTargetCarousel
                  targets={targets}
                  academicYearId={activeYear.id}
                  isMultiUnit={isMultiUnit}
                />
```

- [ ] **Step 2: Tambah prop dan badge di carousel**

Di `feedback-target-carousel.tsx`, tambah prop `isMultiUnit`:

```tsx
export function FeedbackTargetCarousel({
  targets,
  academicYearId,
  isMultiUnit = false,
}: {
  targets: FeedbackTarget[];
  academicYearId: string;
  isMultiUnit?: boolean;
}) {
```

Di dalam `FeedbackTargetCard`, tambah badge unit setelah nama target:

```tsx
          <h2 className="font-semibold">
            {target.full_name}
            {isMultiUnit && target.unit_code && (
              <span className="ml-2 inline-flex items-center rounded-sm border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {target.unit_code}
              </span>
            )}
          </h2>
```

### Task 4: Apply migration & verify

- [ ] **Step 1: Buka Supabase Dashboard -> SQL Editor**
- [ ] **Step 2: Copy `024_feedback_multi_unit_overlap.sql` dan execute**
- [ ] **Step 3: Login sebagai user dari unit berbeda dan verifikasi**

| Test | User | Expected |
|------|------|----------|
| 1 | Guru SMP | Lihat rekan SMP saja |
| 2 | Guru SMP+SMA | Lihat rekan SMP dan SMA |
| 3 | Kepala unit SMP | Monitoring unit SMP |
| 4 | HRD | Lihat semua unit |
