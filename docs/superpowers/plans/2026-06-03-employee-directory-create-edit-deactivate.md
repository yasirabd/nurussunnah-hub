# Employee Directory Create Edit Deactivate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full HRD/Admin employee create, edit, deactivate, and first-login password-change enforcement to `/dashboard/employees`.

**Architecture:** Keep `/dashboard/employees` server-loaded and move complex drawer behavior into the existing client table component. Add focused server actions for Auth Admin user creation, full profile updates, role/unit/position sync, soft deactivation, and password-change flag clearing. Add `profiles.must_change_password` as the trusted app-side marker used by middleware/layout guards.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase SSR, Supabase JS Auth Admin, Postgres migrations, shadcn/ui, lucide-react, TypeScript.

---

## Files

- Modify: `supabase/migrations/001_fase1_foundation.sql` only if seed baseline must know the new column for fresh installs.
- Create: `supabase/migrations/018_employee_password_change_flag.sql` for `profiles.must_change_password`.
- Modify: `src/types/database.ts` to add `must_change_password` to profile row/insert/update types.
- Create: `src/lib/supabase/admin.ts` for server-only service-key Supabase Admin client.
- Create: `src/app/dashboard/change-password/actions.ts` for password update and flag clear.
- Create: `src/app/dashboard/change-password/page.tsx` for forced first-login password UI.
- Modify: `src/lib/supabase/middleware.ts` to enforce inactive and password-change redirects.
- Modify: `src/app/auth/login/page.tsx` to route post-login based on server guard and show inactive/password messages.
- Modify: `src/app/dashboard/employees/page.tsx` to load all profile fields and pass flags.
- Modify: `src/app/dashboard/employees/actions.ts` to add create, full edit, deactivate, and helper routines.
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx` to add create/edit modes, full tabs, and deactivate dialog.

## External Docs Checked

- Supabase JavaScript Auth Admin requires a server-only secret/service key and must never be exposed in the browser: `https://supabase.com/docs/reference/javascript/admin-api`.
- Supabase JavaScript `auth.admin.createUser` creates users server-side and supports `email_confirm`: `https://supabase.com/docs/reference/javascript/auth-admin-createuser`.
- Supabase JavaScript `auth.admin.updateUserById` updates Auth users server-side: `https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid`.

---

### Task 1: Add Password-Change Flag Schema

**Files:**
- Create: `supabase/migrations/018_employee_password_change_flag.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Add migration**

Create `supabase/migrations/018_employee_password_change_flag.sql`:

```sql
-- Force first-login password changes for HRD-created users.
alter table public.profiles
add column if not exists must_change_password boolean not null default false;

create index if not exists idx_profiles_must_change_password
on public.profiles (must_change_password)
where must_change_password = true;
```

- [ ] **Step 2: Update generated type manually**

In `src/types/database.ts`, add `must_change_password: boolean` to `profiles.Row`, `must_change_password?: boolean` to `profiles.Insert`, and `must_change_password?: boolean` to `profiles.Update`.

- [ ] **Step 3: Verify schema typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add supabase/migrations/018_employee_password_change_flag.sql src/types/database.ts
git commit -m "feat: add employee password change flag"
```

---

### Task 2: Add Server-Only Supabase Admin Client

**Files:**
- Create: `src/lib/supabase/admin.ts`

- [ ] **Step 1: Create admin client helper**

Create `src/lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

- [ ] **Step 2: Verify no public service key exposure**

Run: `rg -n "SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE" src`

Expected: only `src/lib/supabase/admin.ts` references `SUPABASE_SERVICE_ROLE_KEY`; no `NEXT_PUBLIC_SUPABASE_SERVICE` match.

- [ ] **Step 3: Verify typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/lib/supabase/admin.ts
git commit -m "feat: add supabase admin client"
```

---

### Task 3: Add Employee Form Parsing Helpers

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Add constants and parsers above existing actions**

Add:

```ts
const DEFAULT_EMPLOYEE_PASSWORD = "bismillahns";
const roleOptions: UserRoleEnum[] = ["PEGAWAI", "KEPALA_UNIT", "HRD", "ADMIN"];

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function normalizeEmployeeNo(formData: FormData) {
  return text(formData, "employee_no").replace(/\s/g, "").toUpperCase();
}

function selectedRoles(formData: FormData): UserRoleEnum[] {
  const roles = roleOptions.filter((role) => formData.get(role) === "on");
  return roles.length ? roles : ["PEGAWAI"];
}

function profilePayload(formData: FormData) {
  return {
    full_name: text(formData, "full_name"),
    employee_no: normalizeEmployeeNo(formData),
    email: text(formData, "email").toLowerCase(),
    phone: nullableText(formData, "phone"),
    gender: text(formData, "gender") === "P" ? "P" : "L",
    marital_status: nullableText(formData, "marital_status"),
    birth_place: nullableText(formData, "birth_place"),
    birth_date: nullableDate(formData, "birth_date"),
    last_education: nullableText(formData, "last_education"),
    study_program: nullableText(formData, "study_program"),
    address_ktp: nullableText(formData, "address_ktp"),
    address_domicile: nullableText(formData, "address_domicile"),
    facebook: nullableText(formData, "facebook"),
    instagram: nullableText(formData, "instagram"),
    twitter: nullableText(formData, "twitter"),
    employee_status: text(formData, "employee_status") as EmployeeStatus,
    is_active: formData.get("is_active") === "on",
    home_unit_id: nullableText(formData, "home_unit_id"),
  };
}
```

- [ ] **Step 2: Remove local duplicate roleOptions inside `updateEmployeeRolesAction`**

Use module-level `roleOptions` and keep behavior otherwise unchanged.

- [ ] **Step 3: Verify typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app/dashboard/employees/actions.ts
git commit -m "refactor: add employee form parsers"
```

---

### Task 4: Add Employee Create and Full Update Actions

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Import admin client**

Add:

```ts
import { createAdminClient } from '@/lib/supabase/admin';
```

- [ ] **Step 2: Add sync helpers below `ensureCanManageEmployees`**

Add:

```ts
async function syncHomeAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  homeUnitId: string | null
) {
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeYear?.id) return;

  const { error: deleteError } = await supabase
    .from('user_unit_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('assignment_type', 'HOME')
    .eq('academic_year_id', activeYear.id);
  if (deleteError) throw deleteError;

  if (!homeUnitId) return;

  const { error: insertError } = await supabase.from('user_unit_assignments').insert({
    user_id: userId,
    unit_id: homeUnitId,
    assignment_type: 'HOME',
    academic_year_id: activeYear.id,
  });
  if (insertError) throw insertError;
}

async function replaceRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  roles: UserRoleEnum[]
) {
  const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('user_roles')
    .insert(roles.map((role) => ({ user_id: userId, role })));
  if (insertError) throw insertError;
}
```

- [ ] **Step 3: Replace old home assignment logic in `updateEmployeeProfileAction`**

Use `const payload = profilePayload(formData);`, update `profiles` with `payload`, then call `await syncHomeAssignment(supabase, id, payload.home_unit_id)` inside `try/catch`. Keep redirect messages.

- [ ] **Step 4: Add `createEmployeeAction`**

Add:

```ts
export async function createEmployeeAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const admin = createAdminClient();
  const payload = profilePayload(formData);

  if (!payload.full_name) redirectWith(false, 'Nama lengkap wajib diisi.');
  if (!payload.employee_no) redirectWith(false, 'NIY wajib diisi.');
  if (!payload.email) redirectWith(false, 'Email wajib diisi.');

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: payload.full_name,
      employee_no: payload.employee_no,
      gender: payload.gender,
    },
  });

  if (authError || !authData.user?.id) {
    redirectWith(false, authError?.message ?? 'Gagal membuat akun login pegawai.');
  }

  const userId = authData.user.id;
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    ...payload,
    must_change_password: true,
  });
  if (profileError) redirectWith(false, profileError.message);

  try {
    await replaceRoles(supabase, userId, selectedRoles(formData));
    await syncHomeAssignment(supabase, userId, payload.home_unit_id);
  } catch (error) {
    redirectWith(false, error instanceof Error ? error.message : 'Gagal menyimpan relasi pegawai.');
  }

  const positionName = text(formData, 'position_name');
  if (positionName) {
    const { error: positionError } = await supabase.from('position_histories').insert({
      user_id: userId,
      unit_id: payload.home_unit_id,
      position_name: positionName,
      start_date: new Date().toISOString().slice(0, 10),
      is_current: true,
    });
    if (positionError) redirectWith(false, positionError.message);
  }

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Pegawai baru berhasil ditambahkan. Password awal: bismillahns.');
}
```

- [ ] **Step 5: Update role action to default PEGAWAI**

Use `const roles = selectedRoles(formData);` in `updateEmployeeRolesAction` so empty checkbox state cannot remove all roles.

- [ ] **Step 6: Verify typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/dashboard/employees/actions.ts
git commit -m "feat: add employee create action"
```

---

### Task 5: Add Deactivate Action

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Step 1: Add `deactivateEmployeeAction`**

Add:

```ts
export async function deactivateEmployeeAction(formData: FormData) {
  const supabase = await ensureCanManageEmployees();
  const admin = createAdminClient();
  const id = text(formData, 'id');
  if (!id) redirectWith(false, 'ID pegawai tidak valid.');

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, employee_status: 'PENSIUN' })
    .eq('id', id);
  if (error) redirectWith(false, error.message);

  await admin.auth.admin.updateUserById(id, {
    app_metadata: { disabled_by_hrd: true },
  });

  revalidatePath('/dashboard/employees');
  redirectWith(true, 'Pegawai berhasil dinonaktifkan.');
}
```

- [ ] **Step 2: Verify typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/app/dashboard/employees/actions.ts
git commit -m "feat: add employee deactivate action"
```

---

### Task 6: Add Password Change Page and Guard

**Files:**
- Create: `src/app/dashboard/change-password/actions.ts`
- Create: `src/app/dashboard/change-password/page.tsx`
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Create server action**

Create `src/app/dashboard/change-password/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_EMPLOYEE_PASSWORD = 'bismillahns';

export async function changeInitialPasswordAction(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirm_password') ?? '');

  if (password.length < 8) redirect('/dashboard/change-password?error=Password%20minimal%208%20karakter.');
  if (password === DEFAULT_EMPLOYEE_PASSWORD) redirect('/dashboard/change-password?error=Gunakan%20password%20baru%20yang%20berbeda.');
  if (password !== confirmPassword) redirect('/dashboard/change-password?error=Konfirmasi%20password%20tidak%20sama.');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) redirect(`/dashboard/change-password?error=${encodeURIComponent(passwordError.message)}`);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);
  if (profileError) redirect(`/dashboard/change-password?error=${encodeURIComponent(profileError.message)}`);

  redirect('/dashboard?success=Password%20berhasil%20diperbarui.');
}
```

- [ ] **Step 2: Create page**

Create `src/app/dashboard/change-password/page.tsx`:

```tsx
import { KeyRound } from 'lucide-react';
import { changeInitialPasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function paramValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function ChangePasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = paramValue(params, 'error');

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center">
      <section className="w-full rounded-[var(--radius-lg)] border bg-card p-6 elevation-1">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Ganti Password Awal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Masukkan password baru sebelum membuka dashboard.</p>
          </div>
        </div>
        {error && <div className="mb-4 rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        <form action={changeInitialPasswordAction} className="space-y-4">
          <Input name="password" type="password" placeholder="Password baru" required minLength={8} />
          <Input name="confirm_password" type="password" placeholder="Konfirmasi password baru" required minLength={8} />
          <Button type="submit" className="w-full">Simpan Password</Button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Update middleware guard**

In `src/lib/supabase/middleware.ts`, after `if (!user && !isPublicRoute)`, load profile for authenticated users and redirect:

```ts
  if (user && !isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active, must_change_password')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && !profile.is_active && url.pathname !== '/auth/logout') {
      url.pathname = '/auth/logout';
      return NextResponse.redirect(url);
    }

    const isChangePasswordRoute = url.pathname === '/dashboard/change-password';
    if (profile?.must_change_password && !isChangePasswordRoute) {
      url.pathname = '/dashboard/change-password';
      return NextResponse.redirect(url);
    }

    if (profile && !profile.must_change_password && isChangePasswordRoute) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }
```

- [ ] **Step 4: Verify typing/build**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/dashboard/change-password src/lib/supabase/middleware.ts
git commit -m "feat: force initial password change"
```

---

### Task 7: Load Full Employee Profile Fields

**Files:**
- Modify: `src/app/dashboard/employees/page.tsx`

- [ ] **Step 1: Extend `ProfileRow`**

Add nullable fields: `gender`, `marital_status`, `birth_place`, `birth_date`, `last_education`, `study_program`, `address_ktp`, `address_domicile`, `facebook`, `instagram`, `twitter`, `must_change_password`.

- [ ] **Step 2: Extend Supabase select**

Replace profile select with:

```ts
"id, full_name, employee_no, email, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, is_active, must_change_password, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)"
```

- [ ] **Step 3: Pass unchanged props to table**

No new prop required if `rows={rows}` uses the extended type.

- [ ] **Step 4: Verify typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/dashboard/employees/page.tsx
git commit -m "feat: load full employee directory fields"
```

---

### Task 8: Rebuild Employee Drawer UI

**Files:**
- Modify: `src/app/dashboard/employees/employee-directory-table.tsx`

- [ ] **Step 1: Update imports**

Import `createEmployeeAction`, `deactivateEmployeeAction`, `Trash2`, and `UserPlus`. Use `aria-label` and visible `sr-only` text for icon-only buttons because this repo has no tooltip component.

- [ ] **Step 2: Extend `EmployeeRow` type**

Add all fields loaded in Task 7.

- [ ] **Step 3: Add mode state**

Add:

```ts
const [mode, setMode] = useState<'create' | 'edit'>('edit');
```

Open create with `setSelectedEmployee(null); setMode('create'); setDrawerOpen(true);`.

- [ ] **Step 4: Add `Tambah Pegawai` button above table**

Render only when `canManageEmployees`:

```tsx
<div className="mb-4 flex justify-end">
  <Button type="button" onClick={() => { setSelectedEmployee(null); setMode('create'); setDrawerOpen(true); }}>
    <UserPlus className="h-4 w-4" />
    Tambah Pegawai
  </Button>
</div>
```

- [ ] **Step 5: Update row actions**

Edit button sets `mode='edit'`. Add deactivate form button for HRD/Admin:

```tsx
<form action={deactivateEmployeeAction}>
  <input type="hidden" name="id" value={row.id} />
  <Button variant="ghost" size="sm" aria-label={`Nonaktifkan ${row.full_name}`}>
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
</form>
```

Wrap the deactivate submit with the existing `AlertDialog` component from `src/components/ui/alert-dialog.tsx`. The dialog title is `Nonaktifkan pegawai?`, the description includes the selected employee name, cancel text is `Batal`, and submit text is `Nonaktifkan`.

- [ ] **Step 6: Replace drawer form area**

Use one component-style structure in the same file:

```tsx
const isCreate = mode === 'create';
const action = isCreate ? createEmployeeAction : updateEmployeeProfileAction;
```

Render full form sections with inputs named exactly like action helpers expect: `full_name`, `employee_no`, `email`, `phone`, `home_unit_id`, `employee_status`, `is_active`, `gender`, `marital_status`, `birth_place`, `birth_date`, `last_education`, `study_program`, `address_ktp`, `address_domicile`, `facebook`, `instagram`, `twitter`, role checkbox names, and `position_name`.

- [ ] **Step 7: Preserve Kepala Unit path**

When `!canManageEmployees`, drawer must render only the existing `Jabatan` tab/form using `updateEmployeeCurrentPositionAction`.

- [ ] **Step 8: Verify UI typing**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/app/dashboard/employees/employee-directory-table.tsx
git commit -m "feat: add employee create edit deactivate ui"
```

---

### Task 9: Final Verification

**Files:**
- Verify all modified files from Tasks 1-8.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 2: Run TypeScript**

Run: `npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Manual smoke checklist**

Run dev server with `npm run dev`, then verify:

- HRD/Admin can open `/dashboard/employees`.
- `Tambah Pegawai` appears only for HRD/Admin.
- Create creates Auth+profile with default password `bismillahns`.
- New user logs in via email and via NIY.
- New user is redirected to `/dashboard/change-password`.
- New password cannot be `bismillahns`.
- After password change, dashboard opens.
- Edit drawer shows all agreed fields.
- Deactivate marks user inactive/pensioned and removes them from active filter.
- Kepala Unit can still only edit current position.

- [ ] **Step 5: Commit verification fixes**

If verification required edits, commit the exact modified files reported by `git status --short`:

```bash
git status --short
git add src supabase docs
git commit -m "fix: stabilize employee directory crud"
```
