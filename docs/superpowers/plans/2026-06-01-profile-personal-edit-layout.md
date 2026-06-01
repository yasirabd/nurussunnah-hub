# Profile Personal Edit Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each user edit contact plus personal profile data, while improving profile card layout for long email/address content.

**Architecture:** Keep the existing server action and edit route. Extend the action whitelist with personal profile fields only. Refine display helpers in `ProfileView` so contact rows can span wider space and wrap long values.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, existing UI components, Tailwind CSS utilities.

---

## File Structure

- Modify `src/app/dashboard/profile/actions.ts`: include `gender`, `marital_status`, `birth_place`, `birth_date`, and `last_education` in self-service updates.
- Modify `src/components/profile/profile-edit-form.tsx`: split form into `Data Pribadi` and `Kontak` sections; add fields for editable personal data.
- Modify `src/components/profile/profile-view.tsx`: improve summary card layout; make contact card wider; make long rows full width and wrapped.
- Create no new DB migrations because fields already exist in `profiles`.

### Task 1: Extend Self-Service Update Fields

**Files:**
- Modify: `src/app/dashboard/profile/actions.ts`

- [ ] **Step 1: Add nullable date helper**

Add helper after `text()`:

```ts
function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}
```

- [ ] **Step 2: Add personal fields to update payload**

Inside `updateMyProfileAction`, add only these fields to the update object:

```ts
gender: text(formData, 'gender') === 'P' ? 'P' : 'L',
marital_status: text(formData, 'marital_status') || null,
birth_place: text(formData, 'birth_place') || null,
birth_date: nullableDate(formData, 'birth_date'),
last_education: text(formData, 'last_education') || null,
```

Keep employment fields out of the payload.

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 2: Improve Edit Form Sections

**Files:**
- Modify: `src/components/profile/profile-edit-form.tsx`

- [ ] **Step 1: Add section helper**

Add below the component or above it:

```tsx
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
```

Import `type ReactNode` instead of using `React.ReactNode` if preferred.

- [ ] **Step 2: Replace one flat form grid with two sections**

Change the `<form>` class to:

```tsx
<form action={updateMyProfileAction} className="space-y-4">
```

Inside it, render:

```tsx
<FormSection title="Data Pribadi">
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground" htmlFor="gender">Jenis Kelamin</label>
    <select id="gender" name="gender" defaultValue={profile.gender} className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
      <option value="L">Laki-laki</option>
      <option value="P">Perempuan</option>
    </select>
  </div>
  <Input name="marital_status" defaultValue={profile.marital_status ?? ""} placeholder="Status pernikahan" />
  <Input name="birth_place" defaultValue={profile.birth_place ?? ""} placeholder="Tempat lahir" />
  <Input name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} placeholder="Tanggal lahir" />
  <Input name="last_education" defaultValue={profile.last_education ?? ""} placeholder="Pendidikan terakhir" className="sm:col-span-2" />
</FormSection>

<FormSection title="Kontak">
  <Input name="phone" defaultValue={profile.phone ?? ""} placeholder="No. HP" />
  <Input name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="URL avatar" />
  <Input name="facebook" defaultValue={profile.facebook ?? ""} placeholder="Facebook" />
  <Input name="instagram" defaultValue={profile.instagram ?? ""} placeholder="Instagram" />
  <Input name="twitter" defaultValue={profile.twitter ?? ""} placeholder="Twitter" />
  <Textarea name="address_ktp" defaultValue={profile.address_ktp ?? ""} placeholder="Alamat KTP" className="min-h-24 sm:col-span-2" />
  <Textarea name="address_domicile" defaultValue={profile.address_domicile ?? ""} placeholder="Alamat domisili" className="min-h-24 sm:col-span-2" />
</FormSection>
```

Place the existing button row after both sections with class:

```tsx
<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 3: Improve Profile View Card Layout

**Files:**
- Modify: `src/components/profile/profile-view.tsx`

- [ ] **Step 1: Replace three equal columns with responsive weighted layout**

Replace the summary grid wrapper:

```tsx
<div className="grid gap-4 xl:grid-cols-3">
```

with:

```tsx
<div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)]">
```

Wrap `Data Pribadi` and `Kepegawaian` in a left stack:

```tsx
<div className="grid gap-4">
  <InfoCard title="Data Pribadi">...</InfoCard>
  <InfoCard title="Kepegawaian">...</InfoCard>
</div>
```

Place `Kontak` as the second grid child.

- [ ] **Step 2: Add row span support**

Update `InfoCard` props:

```tsx
function InfoCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}
```

Update `Row` props and class:

```tsx
span?: "default" | "full";
```

Use:

```tsx
<div className={span === "full" ? "rounded-[var(--radius-md)] bg-secondary/60 p-3 sm:col-span-2" : "rounded-[var(--radius-md)] bg-secondary/60 p-3"}>
```

Set value span class to wrap long text:

```tsx
<span className={value ? "mt-1 block break-words text-foreground" : "mt-1 block italic text-muted-foreground/60"}>
```

- [ ] **Step 3: Make contact long rows full width**

In the `Kontak` card, use:

```tsx
<Row label="Email" value={userEmail} icon={<Mail className="h-3.5 w-3.5" />} span="full" />
<Row label="No. HP" value={profile.phone} icon={<Phone className="h-3.5 w-3.5" />} />
<Row label="Alamat KTP" value={profile.address_ktp} icon={<MapPin className="h-3.5 w-3.5" />} span="full" />
<Row label="Alamat Domisili" value={profile.address_domicile} span="full" />
```

Keep social rows compact.

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: exit `0`.

### Task 4: Final Verification and Commit

**Files:**
- Verify: `src/app/dashboard/profile/actions.ts`
- Verify: `src/components/profile/profile-edit-form.tsx`
- Verify: `src/components/profile/profile-view.tsx`
- Verify: `docs/superpowers/plans/2026-06-01-profile-personal-edit-layout.md`

- [ ] **Step 1: Run TypeScript validation**

Run: `npx tsc --noEmit`
Expected: exit `0`.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit `0`; existing warnings outside profile files may remain.

- [ ] **Step 3: Attempt production build**

Run: `npm run build`
Expected: report actual captured result. If the command only prints `Finished TypeScript ...` without a reliable exit marker, report that limitation.

- [ ] **Step 4: Commit scoped files only**

Run:

```bash
git add src/app/dashboard/profile/actions.ts src/components/profile/profile-edit-form.tsx src/components/profile/profile-view.tsx docs/superpowers/plans/2026-06-01-profile-personal-edit-layout.md
git commit -m "feat: expand profile self editing"
```
