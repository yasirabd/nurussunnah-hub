# Edit Profile Dropdowns Study Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert edit-profile personal fields to controlled dropdowns, add conditional `study_program`, and remove avatar URL editing.

**Architecture:** Add one nullable Supabase column with a forward migration, update local database types, then keep all validation in the existing self-update server action. The edit form remains a client component because it needs education-selection state to show/hide `Program Studi`.

**Tech Stack:** Next.js App Router, React client component state, TypeScript, Supabase Postgres migrations, existing Tailwind/UI components.

---

## File Structure

- Create `supabase/migrations/015_profile_study_program.sql`: additive nullable column migration.
- Modify `src/types/database.ts`: add `study_program` to `profiles.Row`, `profiles.Insert`, and `profiles.Update`.
- Modify `src/app/dashboard/profile/actions.ts`: validate dropdown values, update `study_program`, clear it for non-tertiary education, remove `avatar_url` update.
- Modify `src/components/profile/profile-edit-form.tsx`: add marital/education dropdowns, conditional program study input, remove avatar URL field.
- Modify `src/components/profile/profile-view.tsx`: display program study when present.

### Task 1: Add Study Program Schema Support

**Files:**
- Create: `supabase/migrations/015_profile_study_program.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create migration**

Create `supabase/migrations/015_profile_study_program.sql` with:

```sql
alter table public.profiles
  add column if not exists study_program text;
```

- [ ] **Step 2: Update generated database type by hand**

In `src/types/database.ts`, add the following line to `profiles.Row` after `phone: string | null`:

```ts
          study_program: string | null
```

Add this line to `profiles.Insert` after `phone?: string | null`:

```ts
          study_program?: string | null
```

Add this line to `profiles.Update` after `phone?: string | null`:

```ts
          study_program?: string | null
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 2: Harden Profile Update Action

**Files:**
- Modify: `src/app/dashboard/profile/actions.ts`

- [ ] **Step 1: Add option constants**

Add near the top after imports:

```ts
const MARITAL_STATUS_OPTIONS = ['Sudah Kawin', 'Belum Kawin', 'Cerai'] as const;
const EDUCATION_OPTIONS = [
  'SD/Sederajat',
  'SMP/Sederajat',
  'SMA/SMK/Sederajat',
  'D1/D2/D3',
  'D4/S1',
  'S2',
  'S3',
] as const;
const EDUCATION_WITH_STUDY_PROGRAM = new Set<string>(['D1/D2/D3', 'D4/S1', 'S2', 'S3']);
```

- [ ] **Step 2: Add option helper**

Add after `nullableDate()`:

```ts
function optionOrNull<T extends readonly string[]>(value: string, options: T) {
  return options.includes(value) ? value : null;
}
```

- [ ] **Step 3: Use validated payload values**

Before the Supabase update call, add:

```ts
  const maritalStatus = optionOrNull(text(formData, 'marital_status'), MARITAL_STATUS_OPTIONS);
  const lastEducation = optionOrNull(text(formData, 'last_education'), EDUCATION_OPTIONS);
  const studyProgram = lastEducation && EDUCATION_WITH_STUDY_PROGRAM.has(lastEducation)
    ? text(formData, 'study_program') || null
    : null;
```

Update the payload so it uses:

```ts
    marital_status: maritalStatus,
    last_education: lastEducation,
    study_program: studyProgram,
```

Remove this payload entry completely:

```ts
    avatar_url: text(formData, 'avatar_url') || null,
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 3: Update Edit Profile Form

**Files:**
- Modify: `src/components/profile/profile-edit-form.tsx`

- [ ] **Step 1: Add React state and option constants**

Change import:

```tsx
import { useState, type ReactNode } from "react";
```

Add constants above `interface ProfileEditFormProps`:

```tsx
const MARITAL_STATUS_OPTIONS = ["Sudah Kawin", "Belum Kawin", "Cerai"] as const;
const EDUCATION_OPTIONS = [
  "SD/Sederajat",
  "SMP/Sederajat",
  "SMA/SMK/Sederajat",
  "D1/D2/D3",
  "D4/S1",
  "S2",
  "S3",
] as const;
const EDUCATION_WITH_STUDY_PROGRAM = new Set<string>(["D1/D2/D3", "D4/S1", "S2", "S3"]);
```

Inside `ProfileEditForm`, before return:

```tsx
  const [selectedEducation, setSelectedEducation] = useState(profile.last_education ?? "");
  const showStudyProgram = EDUCATION_WITH_STUDY_PROGRAM.has(selectedEducation);
```

- [ ] **Step 2: Replace marital status input with dropdown**

Replace the current `marital_status` input with:

```tsx
<SelectField label="Status Perkawinan" name="marital_status" defaultValue={profile.marital_status ?? ""}>
  <option value="">Pilih status perkawinan</option>
  {MARITAL_STATUS_OPTIONS.map((option) => (
    <option key={option} value={option}>{option}</option>
  ))}
</SelectField>
```

- [ ] **Step 3: Replace education input and add conditional study program**

Replace the current `last_education` input with:

```tsx
<SelectField
  label="Pendidikan Terakhir"
  name="last_education"
  value={selectedEducation}
  onChange={(event) => setSelectedEducation(event.target.value)}
  className="sm:col-span-2"
>
  <option value="">Pilih pendidikan terakhir</option>
  {EDUCATION_OPTIONS.map((option) => (
    <option key={option} value={option}>{option}</option>
  ))}
</SelectField>
{showStudyProgram && (
  <Input
    name="study_program"
    defaultValue={profile.study_program ?? ""}
    placeholder="Program Studi"
    className="sm:col-span-2"
  />
)}
```

- [ ] **Step 4: Remove avatar URL field**

Delete this field from `Kontak`:

```tsx
<Input name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="URL avatar" />
```

Update the header copy to remove avatar mention:

```tsx
Perbarui data kontak, alamat, media sosial, dan data pribadi.
```

- [ ] **Step 5: Add SelectField helper**

Add below `FormSection`:

```tsx
function SelectField({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <label className="text-xs font-medium text-muted-foreground" htmlFor={props.id ?? props.name}>
        {label}
      </label>
      <select
        id={props.id ?? props.name}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 4: Display Program Study on Profile View

**Files:**
- Modify: `src/components/profile/profile-view.tsx`

- [ ] **Step 1: Add conditional row**

After `Pendidikan Terakhir`, add:

```tsx
{profile.study_program && <Row label="Program Studi" value={profile.study_program} />}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 5: Final Verification and Commit

**Files:**
- Verify: `supabase/migrations/015_profile_study_program.sql`
- Verify: `src/types/database.ts`
- Verify: `src/app/dashboard/profile/actions.ts`
- Verify: `src/components/profile/profile-edit-form.tsx`
- Verify: `src/components/profile/profile-view.tsx`
- Verify: `docs/superpowers/plans/2026-06-01-edit-profile-dropdowns-study-program.md`

- [ ] **Step 1: Run TypeScript validation**

Run: `npx tsc --noEmit`
Expected: exit `0`.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit `0`; existing warnings outside profile files may remain.

- [ ] **Step 3: Attempt build**

Run: `npm run build`
Expected: report actual captured result. If this shell still only prints `Finished TypeScript ...`, report that limitation.

- [ ] **Step 4: Inspect staged diff**

Run: `git diff --cached --name-only`
Expected: only files listed in this task.

- [ ] **Step 5: Commit**

Run:

```bash
git add supabase/migrations/015_profile_study_program.sql src/types/database.ts src/app/dashboard/profile/actions.ts src/components/profile/profile-edit-form.tsx src/components/profile/profile-view.tsx docs/superpowers/plans/2026-06-01-edit-profile-dropdowns-study-program.md
git commit -m "feat: refine edit profile fields"
```
