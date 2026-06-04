# Unit & Organisasi Dialog UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/dashboard/units` into a dialog-first, read-focused Admin settings page matching `/dashboard/academic-years`.

**Architecture:** Keep `page.tsx` as the server loader/auth guard. Move interactive rendering and dialogs into `units-client.tsx`, importing the existing server actions unchanged.

**Tech Stack:** Next.js App Router, React 19, Supabase server client, Base UI dialog components already wrapped under `src/components/ui`, lucide-react icons, Tailwind utility classes.

---

## File Structure

- Modify: `src/app/dashboard/units/page.tsx`
  - Keep metadata, `PageProps`, `messageValue`, auth/Admin guard, Supabase reads.
  - Remove UI imports and inline JSX form/table rendering.
  - Import and render `UnitsClient` with plain data props.
- Create: `src/app/dashboard/units/units-client.tsx`
  - Client component for header, messages, organization card, unit list, and dialogs.
  - Local row types, `Field`, `AddUnitDialog`, `EditOrganizationDialog`, `EditUnitDialog`.
  - Import `createUnitAction`, `updateOrganizationAction`, `updateUnitAction` from `./actions`.
- Preserve: `src/app/dashboard/units/actions.ts`
  - No behavior changes.

## Task 1: Server Loader Boundary

**Files:**
- Modify: `src/app/dashboard/units/page.tsx`

- [ ] **Step 1: Replace UI imports with client component import**

Update the top of `src/app/dashboard/units/page.tsx` to this import set:

```tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { UnitsClient } from "./units-client";
```

- [ ] **Step 2: Replace return JSX with `UnitsClient` handoff**

Keep all existing auth/Admin/query code through these lines:

```tsx
const organization = organizations?.[0] ?? null;
const activeUnits = (units ?? []).filter((unit) => unit.is_active).length;
```

Replace the whole `return (...)` block and remove the local `Field` helper with:

```tsx
return (
  <UnitsClient
    organization={organization}
    units={units ?? []}
    activeUnits={activeUnits}
    successMessage={messageValue(params, "success")}
    errorMessage={messageValue(params, "error")}
    queryError={error?.message}
  />
);
```

- [ ] **Step 3: Verify server file has no client-only imports**

Run:

```powershell
rg -n "Badge|Button|Card|Input|Label|Textarea|Table|Building2|Plus|updateUnitAction|createUnitAction|updateOrganizationAction|function Field" src\app\dashboard\units\page.tsx
```

Expected: no matches.

- [ ] **Step 4: Commit server boundary**

Run:

```powershell
git add src\app\dashboard\units\page.tsx
git commit -m "refactor: split units page server loader"
```

Expected: commit succeeds.

## Task 2: Dialog-First Client UI

**Files:**
- Create: `src/app/dashboard/units/units-client.tsx`

- [ ] **Step 1: Create client component file**

Create `src/app/dashboard/units/units-client.tsx` with this complete content:

```tsx
"use client";

import type { ReactNode } from "react";
import { Building2, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createUnitAction, updateOrganizationAction, updateUnitAction } from "./actions";

type OrganizationRow = {
  id: string;
  name: string;
  description: string | null;
};

type UnitRow = {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
  organizations: { name: string } | null;
};

type UnitsClientProps = {
  organization: OrganizationRow | null;
  units: UnitRow[];
  activeUnits: number;
  successMessage?: string;
  errorMessage?: string;
  queryError?: string;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function UnitsClient({
  organization,
  units,
  activeUnits,
  successMessage,
  errorMessage,
  queryError,
}: UnitsClientProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Unit & Organisasi</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Kelola entitas yayasan dan unit sekolah yang dipakai profil pegawai.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Badge className="h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
            {activeUnits} unit aktif
          </Badge>
          <AddUnitDialog organization={organization} />
        </div>
      </div>

      {successMessage && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Organisasi</CardTitle>
            <CardDescription>Entitas induk untuk seluruh unit.</CardDescription>
          </div>
          {organization && <EditOrganizationDialog organization={organization} />}
        </CardHeader>
        <CardContent>
          {organization ? (
            <div className="space-y-2">
              <p className="font-medium">{organization.name}</p>
              <p className="text-sm leading-6 text-muted-foreground">
                {organization.description || "Belum ada deskripsi organisasi."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Organisasi belum tersedia.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Unit</CardTitle>
          <CardDescription>
            Unit aktif dipakai untuk assignment, profil, feedback, dan review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queryError ? (
            <p className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {queryError}
            </p>
          ) : units.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada unit.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Unit</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id} className={unit.is_active ? "bg-primary/5" : undefined}>
                    <TableCell className="font-medium">{unit.code}</TableCell>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell>{unit.organizations?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={unit.is_active ? "default" : "secondary"}>
                        {unit.is_active ? "Aktif" : "Non-aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <EditUnitDialog unit={unit} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddUnitDialog({ organization }: { organization: OrganizationRow | null }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" className="w-full sm:w-fit" disabled={!organization} />}>
        <Plus className="h-4 w-4" />
        Tambah Unit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Unit</DialogTitle>
          <DialogDescription>Kode unit wajib unik, contoh TK, SD, YAYASAN.</DialogDescription>
        </DialogHeader>
        <form action={createUnitAction} className="space-y-4">
          <input type="hidden" name="organization_id" value={organization?.id ?? ""} />
          <Field label="Nama unit">
            <Input name="name" placeholder="SMA Nurus Sunnah" required />
          </Field>
          <Field label="Kode">
            <Input name="code" placeholder="SMA" required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-input" />
            Unit aktif
          </label>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
            <Button type="submit" disabled={!organization}>
              <Plus className="h-4 w-4" />
              Tambah Unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOrganizationDialog({ organization }: { organization: OrganizationRow }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Building2 className="h-4 w-4" />
        Edit Organisasi
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organisasi</DialogTitle>
          <DialogDescription>Perbarui nama dan deskripsi organisasi induk.</DialogDescription>
        </DialogHeader>
        <form action={updateOrganizationAction} className="space-y-4">
          <input type="hidden" name="id" value={organization.id} />
          <Field label="Nama organisasi">
            <Input name="name" defaultValue={organization.name} required />
          </Field>
          <Field label="Deskripsi">
            <Textarea name="description" defaultValue={organization.description ?? ""} className="min-h-24" />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
            <Button type="submit">Simpan Organisasi</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUnitDialog({ unit }: { unit: UnitRow }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil className="h-4 w-4" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Unit</DialogTitle>
          <DialogDescription>Perbarui nama, kode, dan status unit.</DialogDescription>
        </DialogHeader>
        <form action={updateUnitAction} className="space-y-4">
          <input type="hidden" name="id" value={unit.id} />
          <Field label="Nama unit">
            <Input name="name" defaultValue={unit.name} required />
          </Field>
          <Field label="Kode">
            <Input name="code" defaultValue={unit.code} required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" defaultChecked={unit.is_active} className="h-4 w-4 rounded border-input" />
            Unit aktif
          </label>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
            <Button type="submit">Simpan Unit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run TypeScript/build verification**

Run:

```powershell
npm run build
```

Expected: build completes successfully with no TypeScript or Next.js errors.

- [ ] **Step 3: Commit client UI**

Run:

```powershell
git add src\app\dashboard\units\units-client.tsx
git commit -m "feat: add units dialog client ui"
```

Expected: commit succeeds.

## Task 3: Final Verification

**Files:**
- Verify: `src/app/dashboard/units/page.tsx`
- Verify: `src/app/dashboard/units/units-client.tsx`

- [ ] **Step 1: Confirm old inline forms are gone from server page**

Run:

```powershell
rg -n "<form|<Input|<Textarea|updateUnitAction|createUnitAction|updateOrganizationAction|function Field" src\app\dashboard\units\page.tsx
```

Expected: no matches.

- [ ] **Step 2: Confirm dialog UI exists in client file**

Run:

```powershell
rg -n "AddUnitDialog|EditOrganizationDialog|EditUnitDialog|DialogContent|Tambah Unit|Edit Organisasi|Simpan Unit" src\app\dashboard\units\units-client.tsx
```

Expected: matches for each dialog component and label.

- [ ] **Step 3: Confirm no server action behavior changed**

Run:

```powershell
git diff HEAD~2 -- src\app\dashboard\units\actions.ts
```

Expected: no diff output.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: build completes successfully.

- [ ] **Step 5: Commit verification note if any correction was needed**

If Task 3 required code corrections, commit them with:

```powershell
git add src\app\dashboard\units\page.tsx src\app\dashboard\units\units-client.tsx
git commit -m "fix: polish units dialog ui"
```

Expected: commit succeeds only when corrections were made. If no corrections were made, skip this step.

## Self-Review

- Spec coverage: Task 1 implements server/client split. Task 2 implements read-focused header, organization card, unit table, status badges, all dialogs, and unchanged server actions. Task 3 verifies inline forms are removed and build passes.
- Placeholder scan: no placeholder markers, unspecified implementation, or omitted code steps remain.
- Type consistency: `OrganizationRow`, `UnitRow`, `UnitsClientProps`, `AddUnitDialog`, `EditOrganizationDialog`, and `EditUnitDialog` names are defined before use and match the data selected in `page.tsx`.
