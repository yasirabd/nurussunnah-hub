# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `Profil Saya` into a clean read-only profile page and a dedicated edit profile page.

**Architecture:** Keep profile data loading in server pages. Make `ProfileView` display-only. Move editable fields into a focused client form component rendered by `/dashboard/profile/edit` and submitted through the existing server action.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Supabase, shadcn-style UI components, lucide-react.

---

## File Structure

- Modify `src/components/profile/profile-view.tsx`: remove inline form, add read-only cards, add `Edit Profil` link button, add empty states for histories/assignments.
- Create `src/components/profile/profile-edit-form.tsx`: client component containing the personal profile form and back action.
- Create `src/app/dashboard/profile/edit/page.tsx`: server page fetching authenticated user profile and rendering edit form.
- Keep `src/app/dashboard/profile/actions.ts`: reuse `updateMyProfileAction` unchanged unless TypeScript exposes a real issue.

### Task 1: Make ProfileView Display-Only

**Files:**
- Modify: `src/components/profile/profile-view.tsx`

- [ ] **Step 1: Remove edit imports**

Remove these imports from `src/components/profile/profile-view.tsx`:

```tsx
import { updateMyProfileAction } from "@/app/dashboard/profile/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
```

Add these imports:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
```

- [ ] **Step 2: Replace hero action area**

In the profile hero, replace the right-side unit pill with an action stack:

```tsx
<div className="flex flex-col gap-2 sm:items-end">
  <Button asChild>
    <Link href="/dashboard/profile/edit">
      <Edit3 className="h-4 w-4" />
      Edit Profil
    </Link>
  </Button>
  {profile.units && (
    <div className="flex items-center gap-2 rounded-[var(--radius-full)] border bg-secondary px-3 py-2 text-sm">
      <Building2 className="h-4 w-4 text-primary" />
      <span>{profile.units.code}</span>
    </div>
  )}
</div>
```

- [ ] **Step 3: Replace inline edit card with employment summary card**

Remove the full `Ubah Data Personal` card and insert this card in the info grid after contact/personal cards:

```tsx
<InfoCard title="Kepegawaian">
  <Row label="NIY" value={profile.employee_no} icon={<UserRound className="h-3.5 w-3.5" />} />
  <Row label="Unit Induk" value={profile.units?.name} icon={<Building2 className="h-3.5 w-3.5" />} />
  <Row
    label="Status Pegawai"
    value={EMPLOYEE_STATUS_LABELS[profile.employee_status] ?? profile.employee_status}
    icon={<Briefcase className="h-3.5 w-3.5" />}
  />
  <Row label="Status Akun" value={profile.is_active ? "Aktif" : "Non-aktif"} />
</InfoCard>
```

Change the grid wrapper from `lg:grid-cols-2` to `xl:grid-cols-3`.

- [ ] **Step 4: Add empty states**

Render `Histori Jabatan` and `Penugasan Unit` cards even when arrays are empty. For empty histories show:

```tsx
<EmptyState message="Belum ada histori jabatan yang tercatat." />
```

For empty unit assignments show:

```tsx
<EmptyState message="Belum ada penugasan unit yang tercatat." />
```

Add helper:

```tsx
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed bg-secondary/30 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no TypeScript errors from `profile-view.tsx`.

### Task 2: Add Edit Form Component

**Files:**
- Create: `src/components/profile/profile-edit-form.tsx`

- [ ] **Step 1: Create client form component**

Create `src/components/profile/profile-edit-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { updateMyProfileAction } from "@/app/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/types/database";

interface ProfileEditFormProps {
  profile: Profile;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3 w-fit">
            <Link href="/dashboard/profile">
              <ArrowLeft className="h-4 w-4" />
              Profil Saya
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-normal">Edit Profil</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Perbarui data kontak, alamat, media sosial, dan avatar profil.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Personal</CardTitle>
          <CardDescription>Perubahan akan tersimpan ke profil akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateMyProfileAction} className="grid gap-4 sm:grid-cols-2">
            <Input name="phone" defaultValue={profile.phone ?? ""} placeholder="No. HP" />
            <Input name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="URL avatar" />
            <Input name="facebook" defaultValue={profile.facebook ?? ""} placeholder="Facebook" />
            <Input name="instagram" defaultValue={profile.instagram ?? ""} placeholder="Instagram" />
            <Input name="twitter" defaultValue={profile.twitter ?? ""} placeholder="Twitter" />
            <Textarea name="address_ktp" defaultValue={profile.address_ktp ?? ""} placeholder="Alamat KTP" className="min-h-24 sm:col-span-2" />
            <Textarea name="address_domicile" defaultValue={profile.address_domicile ?? ""} placeholder="Alamat domisili" className="min-h-24 sm:col-span-2" />
            <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline">
                <Link href="/dashboard/profile">Batal</Link>
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4" />
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: if `CardDescription` export is valid, no errors from the new component.

### Task 3: Add Edit Profile Route

**Files:**
- Create: `src/app/dashboard/profile/edit/page.tsx`

- [ ] **Step 1: Create server route**

Create `src/app/dashboard/profile/edit/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit Profil - Nurussunnah Hub" };

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/dashboard/profile?error=Data%20profil%20belum%20tersedia.");
  }

  return <ProfileEditForm profile={profile} />;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no route typing errors.

### Task 4: Final Verification

**Files:**
- Verify: `src/components/profile/profile-view.tsx`
- Verify: `src/components/profile/profile-edit-form.tsx`
- Verify: `src/app/dashboard/profile/edit/page.tsx`

- [ ] **Step 1: Run TypeScript validation**

Run: `npx tsc --noEmit`
Expected: command exits `0`.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: command exits `0`.

- [ ] **Step 3: Inspect git diff**

Run: `git diff -- src/components/profile/profile-view.tsx src/components/profile/profile-edit-form.tsx src/app/dashboard/profile/edit/page.tsx`
Expected: diff only contains profile page redesign and edit route changes.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add src/components/profile/profile-view.tsx src/components/profile/profile-edit-form.tsx src/app/dashboard/profile/edit/page.tsx docs/superpowers/plans/2026-06-01-profile-page-redesign.md
git commit -m "feat: redesign profile page"
```
