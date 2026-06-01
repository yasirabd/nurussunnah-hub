# Employee Directory Kepala Unit Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope employee directory filters by role and let every Kepala Unit edit only the active position name for employees in their own unit.

**Architecture:** Keep `/dashboard/employees` as a server-rendered page. Add one focused server action for current-position updates, plus one Supabase RLS migration that permits scoped `position_histories` updates for Kepala Unit while HRD/Admin behavior stays unchanged.

**Tech Stack:** Next.js App Router server components/actions, TypeScript, Supabase PostgreSQL/RLS, Tailwind/shadcn UI primitives.

---

## File Structure

- Modify `src/app/dashboard/employees/page.tsx`: derive role-aware unit and active filters, render scoped unit/status controls, render current-position edit forms for authorized users.
- Modify `src/app/dashboard/employees/actions.ts`: add allowed-unit helper and `updateEmployeeCurrentPositionAction` with role/scope validation.
- Create `supabase/migrations/016_employee_directory_kepala_unit_position_update.sql`: add RLS policy allowing Kepala Unit to update current position rows in their unit scope.
- No new UI component files; changes are small and local to the existing directory module.

## Task 1: Add RLS Policy for Kepala Unit Position Updates

**Files:**
- Create: `supabase/migrations/016_employee_directory_kepala_unit_position_update.sql`

- [ ] **Step 1: Create migration file**

Add this SQL:

```sql
-- Allow every Kepala Unit to update active position rows for employees in their own unit scope.
-- Application code only updates position_name; RLS constrains which rows are mutable.
CREATE POLICY "positions_update_kepala_unit_current"
ON public.position_histories
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_kepala_unit())
  AND is_current = true
  AND user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.home_unit_id IN (
      SELECT scoped_units.unit_id
      FROM (
        SELECT uua.unit_id
        FROM public.user_unit_assignments uua
        WHERE uua.user_id = (SELECT auth.uid())
          AND uua.assignment_type = 'HOME'
        UNION
        SELECT self_profile.home_unit_id
        FROM public.profiles self_profile
        WHERE self_profile.id = (SELECT auth.uid())
          AND self_profile.home_unit_id IS NOT NULL
      ) scoped_units
    )
  )
)
WITH CHECK (
  (SELECT public.is_kepala_unit())
  AND is_current = true
  AND user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.home_unit_id IN (
      SELECT scoped_units.unit_id
      FROM (
        SELECT uua.unit_id
        FROM public.user_unit_assignments uua
        WHERE uua.user_id = (SELECT auth.uid())
          AND uua.assignment_type = 'HOME'
        UNION
        SELECT self_profile.home_unit_id
        FROM public.profiles self_profile
        WHERE self_profile.id = (SELECT auth.uid())
          AND self_profile.home_unit_id IS NOT NULL
      ) scoped_units
    )
  )
);
```

- [ ] **Step 2: Review migration syntax**

Run: `Get-Content -LiteralPath supabase\migrations\016_employee_directory_kepala_unit_position_update.sql`

Expected: file contains one `CREATE POLICY` statement, no placeholders, no destructive DDL.

- [ ] **Step 3: Commit migration**

Run:

```powershell
git add supabase\migrations\016_employee_directory_kepala_unit_position_update.sql
git commit -m "feat: allow kepala unit position updates"
```

Expected: commit succeeds with one new migration file.

## Task 2: Add Server Action for Current Position Updates

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Add role and scope helpers**

Insert these helpers after `redirectWith`:

```ts
type EmployeeRole = 'PEGAWAI' | 'KEPALA_UNIT' | 'HRD' | 'ADMIN';

function hasAnyRole(roles: string[], allowed: EmployeeRole[]) {
  return allowed.some((role) => roles.includes(role));
}

async function getAllowedKepalaUnitIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [{ data: assignments }, { data: profile }] = await Promise.all([
    supabase
      .from('user_unit_assignments')
      .select('unit_id')
      .eq('user_id', userId)
      .eq('assignment_type', 'HOME'),
    supabase.from('profiles').select('home_unit_id').eq('id', userId).maybeSingle(),
  ]);

  return Array.from(
    new Set([
      ...(assignments ?? []).map((item) => item.unit_id).filter(Boolean),
      profile?.home_unit_id,
    ].filter((unitId): unitId is string => Boolean(unitId)))
  );
}
```

- [ ] **Step 2: Refactor `ensureCanManageEmployees` role check without changing behavior**

Replace the `canManage` line with:

```ts
  const roleNames = (roles ?? []).map((item) => item.role);
  const canManage = hasAnyRole(roleNames, ['HRD', 'ADMIN']);
```

Expected: HRD/Admin profile and role management still uses the existing action path.

- [ ] **Step 3: Add `updateEmployeeCurrentPositionAction`**

Append this action after `updateEmployeeRolesAction`:

```ts
export async function updateEmployeeCurrentPositionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const userId = text(formData, 'user_id');
  const positionName = text(formData, 'position_name');
  if (!positionName) redirectWith(false, 'Nama jabatan wajib diisi.');

  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const roles = (roleRows ?? []).map((item) => item.role);
  const isManager = hasAnyRole(roles, ['HRD', 'ADMIN']);
  const isKepalaUnit = roles.includes('KEPALA_UNIT');

  if (!isManager && !isKepalaUnit) redirect('/dashboard');

  if (!isManager) {
    const allowedUnitIds = await getAllowedKepalaUnitIds(supabase, user.id);
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('home_unit_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) redirectWith(false, targetError.message);
    if (!targetProfile?.home_unit_id || !allowedUnitIds.includes(targetProfile.home_unit_id)) {
      redirectWith(false, 'Anda tidak berwenang mengubah jabatan pegawai di luar unit Anda.');
    }
  }

  const { data: existingPosition, error: existingError } = await supabase
    .from('position_histories')
    .select('id')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();

  if (existingError) redirectWith(false, existingError.message);
  if (!existingPosition?.id) redirectWith(false, 'Pegawai belum memiliki jabatan aktif.');

  const { error } = await supabase
    .from('position_histories')
    .update({ position_name: positionName })
    .eq('id', existingPosition.id)
    .eq('is_current', true);

  revalidatePath('/dashboard/employees');
  redirectWith(!error, error ? error.message : 'Jabatan pegawai berhasil diperbarui.');
}
```

- [ ] **Step 4: Run TypeScript check for action changes**

Run: `npx tsc --noEmit --incremental false`

Expected: no TypeScript errors from `actions.ts`.

- [ ] **Step 5: Commit action changes**

Run:

```powershell
git add src\app\dashboard\employees\actions.ts
git commit -m "feat: add employee position update action"
```

Expected: commit succeeds with one modified action file.

## Task 3: Scope Directory Filters and Render Position Edit Controls

**Files:**
- Modify: `src/app/dashboard/employees/page.tsx`

- [ ] **Step 1: Import the new action**

Replace the action import with:

```ts
import {
  updateEmployeeCurrentPositionAction,
  updateEmployeeProfileAction,
  updateEmployeeRolesAction,
} from "./actions";
```

- [ ] **Step 2: Add scoped unit row type**

After `type PositionRow`, add:

```ts
type UnitRow = { id: string; name: string; code: string };
```

- [ ] **Step 3: Derive role-aware active filter**

Replace:

```ts
  const active = paramValue(params, "active") || "active";
```

with:

```ts
  const requestedActive = paramValue(params, "active") || "active";
```

After `canManageEmployees` is defined, add:

```ts
  const canFilterInactive = canManageEmployees;
```

After `errorMessage`, add:

```ts
  const active = canFilterInactive ? requestedActive : "active";
```

- [ ] **Step 4: Load allowed unit IDs for Kepala Unit**

Replace the current units query block with:

```ts
  const [{ data: allUnits }, { data: myAssignments }, { data: myProfile }] = await Promise.all([
    supabase.from("units").select("id, name, code").order("code", { ascending: true }),
    supabase
      .from("user_unit_assignments")
      .select("unit_id")
      .eq("user_id", user.id)
      .eq("assignment_type", "HOME"),
    supabase.from("profiles").select("home_unit_id").eq("id", user.id).maybeSingle(),
  ]);

  const allowedUnitIds = canManageEmployees
    ? []
    : Array.from(
        new Set([
          ...(myAssignments ?? []).map((item) => item.unit_id).filter(Boolean),
          myProfile?.home_unit_id,
        ].filter((id): id is string => Boolean(id)))
      );
  const units = canManageEmployees
    ? ((allUnits ?? []) as UnitRow[])
    : ((allUnits ?? []) as UnitRow[]).filter((unit) => allowedUnitIds.includes(unit.id));
  const normalizedUnitId = canManageEmployees || allowedUnitIds.includes(unitId) ? unitId : "";
```

- [ ] **Step 5: Use normalized unit filter in query and form**

Replace:

```ts
  if (unitId) query = query.eq("home_unit_id", unitId);
```

with:

```ts
  if (normalizedUnitId) query = query.eq("home_unit_id", normalizedUnitId);
```

Replace both `defaultValue={unitId}` occurrences in filter form with:

```tsx
defaultValue={normalizedUnitId}
```

- [ ] **Step 6: Hide inactive/all filter options for non-HRD/Admin**

Replace the active select options with:

```tsx
              <option value="active">Aktif</option>
              {canFilterInactive && <option value="inactive">Non-aktif</option>}
              {canFilterInactive && <option value="all">Semua status</option>}
```

- [ ] **Step 7: Render position edit form for authorized rows**

Replace the Jabatan table cell content with:

```tsx
                      <div className="min-w-56 space-y-2">
                        <PillList values={positionsByUser.get(row.id) ?? []} fallback="-" />
                        {(canManageEmployees || roles.includes("KEPALA_UNIT")) && (
                          <form action={updateEmployeeCurrentPositionAction} className="flex gap-2">
                            <input type="hidden" name="user_id" value={row.id} />
                            <Input
                              name="position_name"
                              defaultValue={(positionsByUser.get(row.id) ?? [""])[0]}
                              placeholder="Jabatan aktif"
                              className="h-9 min-w-40"
                            />
                            <Button type="submit" variant="outline" size="sm">
                              Simpan
                            </Button>
                          </form>
                        )}
                      </div>
```

- [ ] **Step 8: Run TypeScript check for page changes**

Run: `npx tsc --noEmit --incremental false`

Expected: no TypeScript errors from `page.tsx`.

- [ ] **Step 9: Commit page changes**

Run:

```powershell
git add src\app\dashboard\employees\page.tsx
git commit -m "feat: scope employee directory for kepala unit"
```

Expected: commit succeeds with one modified page file.

## Task 4: Verify Build and Review Final Diff

**Files:**
- Verify: `src/app/dashboard/employees/page.tsx`
- Verify: `src/app/dashboard/employees/actions.ts`
- Verify: `supabase/migrations/016_employee_directory_kepala_unit_position_update.sql`

- [ ] **Step 1: Run TypeScript**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: build completes. Existing unrelated warnings are acceptable; new TypeScript/build errors are not.

- [ ] **Step 3: Inspect changed files**

Run: `git status --short`

Expected: only intended files changed or clean after task commits. Existing unrelated user changes may still be present and must not be reverted.

- [ ] **Step 4: Manual smoke checklist**

Use seeded/local users where available:

```text
HRD/Admin:
- Unit filter shows every unit.
- Active filter shows Aktif, Non-aktif, Semua status.
- Existing employee management forms still render.

Kepala Unit:
- Unit filter shows only that Kepala Unit's scoped unit(s).
- URL active=inactive still returns active employees only.
- Position edit form appears for visible employees.
- Updating an employee in the same unit succeeds.
- Updating an employee outside the unit returns an authorization error.
```

- [ ] **Step 5: Final commit if verification caused edits**

If verification required code changes, run:

```powershell
git add src\app\dashboard\employees\page.tsx src\app\dashboard\employees\actions.ts supabase\migrations\016_employee_directory_kepala_unit_position_update.sql
git commit -m "fix: verify employee directory kepala unit scope"
```

Expected: commit only if there are verification fixes.

## Self-Review

- Spec coverage: unit filter scope is Task 3, active-status restriction is Task 3, Kepala Unit position editing is Tasks 1-3, HRD/Admin unchanged behavior is preserved by role branches and verified in Task 4.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain.
- Type consistency: action name `updateEmployeeCurrentPositionAction`, helper `getAllowedKepalaUnitIds`, type `UnitRow`, and migration policy name are consistent across tasks.
