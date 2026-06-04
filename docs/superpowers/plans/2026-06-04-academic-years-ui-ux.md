# Academic Years UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/dashboard/academic-years` into a list-first page with add/edit dialogs and activation confirmation.

**Architecture:** Keep auth, role checks, Supabase reads, metadata, query-param messages, and date formatting in the server page. Move interactive add/edit/activate dialogs and the academic-year table into one client component that receives plain year data and server actions as form actions.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, local UI primitives, Base UI dialog wrappers, Supabase server actions.

---

## File Structure

- Modify: `src/app/dashboard/academic-years/page.tsx` for server-only auth, role checks, Supabase query, messages, and shell handoff.
- Create: `src/app/dashboard/academic-years/academic-years-client.tsx` for header action, add/edit dialogs, activation confirmation, table rows, empty state, and query error state.
- No schema, action, route, or shared UI primitive changes.

---

### Task 1: Create Client Component Shell

**Files:**
- Create: `src/app/dashboard/academic-years/academic-years-client.tsx`
- Modify: `src/app/dashboard/academic-years/page.tsx`

- [ ] **Step 1: Create `academic-years-client.tsx` with props, header, messages, empty/query states, and non-interactive table.**

Use this complete initial file:

```tsx
"use client";

import { CalendarDays } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AcademicYearRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type AcademicYearsClientProps = {
  years: AcademicYearRow[];
  activeYearName?: string;
  successMessage?: string;
  errorMessage?: string;
  queryError?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AcademicYearsClient({
  years,
  activeYearName,
  successMessage,
  errorMessage,
  queryError,
}: AcademicYearsClientProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Tahun Pelajaran</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Kelola periode akademik yang dipakai surat kerja, feedback, dan penugasan unit.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {activeYearName && (
            <Badge className="h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
              Aktif: {activeYearName}
            </Badge>
          )}
          <Button type="button" className="w-full sm:w-fit">
            <CalendarDays className="h-4 w-4" />
            Tambah Tahun
          </Button>
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
        <CardHeader>
          <CardTitle>Daftar Tahun Pelajaran</CardTitle>
          <CardDescription>
            Hanya satu tahun yang seharusnya aktif untuk workflow berjalan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queryError ? (
            <p className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {queryError}
            </p>
          ) : years.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada tahun pelajaran.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year.id} className={year.is_active ? "bg-primary/5" : undefined}>
                    <TableCell className="font-medium">{year.name}</TableCell>
                    <TableCell>
                      {formatDate(year.start_date)} - {formatDate(year.end_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={year.is_active ? "default" : "secondary"}>
                        {year.is_active ? "Aktif" : "Arsip"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <Button type="button" variant="outline" size="sm">
                          Edit
                        </Button>
                        {!year.is_active && (
                          <Button type="button" size="sm">
                            Aktifkan
                          </Button>
                        )}
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
```

- [ ] **Step 2: Update `page.tsx` to render the client component.**

Remove UI primitive imports, `formatDate`, `Field`, and the old JSX layout. Keep `messageValue`, auth/role checks, Supabase query, and `activeYear`. Add:

```tsx
import { AcademicYearsClient } from "./academic-years-client";
```

Return:

```tsx
  return (
    <AcademicYearsClient
      years={years ?? []}
      activeYearName={activeYear?.name}
      successMessage={messageValue(params, "success")}
      errorMessage={messageValue(params, "error")}
      queryError={error?.message}
    />
  );
```

- [ ] **Step 3: Run `npx tsc --noEmit`. Expected: exit 0, no TypeScript errors.**

---

### Task 2: Add Create And Edit Dialogs

**Files:**
- Modify: `src/app/dashboard/academic-years/academic-years-client.tsx`

- [ ] **Step 1: Add dialog, input, label, icon, and server action imports.**

Use these imports at the top:

```tsx
import { CalendarDays, Pencil } from "lucide-react";

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
import {
  createAcademicYearAction,
  updateAcademicYearAction,
} from "./actions";
```

- [ ] **Step 2: Add the local `Field` helper below `formatDate`.**

```tsx
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Replace the `Tambah Tahun` button with an add dialog.**

```tsx
          <Dialog>
            <DialogTrigger render={<Button type="button" className="w-full sm:w-fit" />}>
              <CalendarDays className="h-4 w-4" />
              Tambah Tahun
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Tahun Pelajaran</DialogTitle>
                <DialogDescription>
                  Buat periode akademik baru untuk digunakan pada workflow sekolah.
                </DialogDescription>
              </DialogHeader>
              <form action={createAcademicYearAction} className="space-y-4">
                <Field label="Nama">
                  <Input name="name" placeholder="2026/2027" required />
                </Field>
                <Field label="Tanggal mulai">
                  <Input name="start_date" type="date" required />
                </Field>
                <Field label="Tanggal selesai">
                  <Input name="end_date" type="date" required />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input name="is_active" type="checkbox" className="h-4 w-4 rounded border-input" />
                  Jadikan tahun aktif
                </label>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Batal
                  </DialogClose>
                  <Button type="submit">
                    <CalendarDays className="h-4 w-4" />
                    Simpan Tahun
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
```

- [ ] **Step 4: Replace the row `Edit` button with a prefilled edit dialog.**

```tsx
                        <Dialog>
                          <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Tahun Pelajaran</DialogTitle>
                              <DialogDescription>
                                Perbarui nama dan rentang tanggal tahun pelajaran.
                              </DialogDescription>
                            </DialogHeader>
                            <form action={updateAcademicYearAction} className="space-y-4">
                              <input type="hidden" name="id" value={year.id} />
                              <Field label="Nama">
                                <Input name="name" defaultValue={year.name} required />
                              </Field>
                              <Field label="Tanggal mulai">
                                <Input name="start_date" type="date" defaultValue={year.start_date} required />
                              </Field>
                              <Field label="Tanggal selesai">
                                <Input name="end_date" type="date" defaultValue={year.end_date} required />
                              </Field>
                              <DialogFooter>
                                <DialogClose render={<Button type="button" variant="outline" />}>
                                  Batal
                                </DialogClose>
                                <Button type="submit">Simpan Perubahan</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
```

- [ ] **Step 5: Run `npx tsc --noEmit`. Expected: exit 0, no TypeScript errors.**

---

### Task 3: Add Activation Confirmation

**Files:**
- Modify: `src/app/dashboard/academic-years/academic-years-client.tsx`

- [ ] **Step 1: Add alert-dialog imports, activation icon, and activation action.**

Use these combined imports:

```tsx
import { CalendarDays, CheckCircle2, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createAcademicYearAction,
  setActiveAcademicYearAction,
  updateAcademicYearAction,
} from "./actions";
```

- [ ] **Step 2: Replace the non-active row `Aktifkan` button with confirmation.**

```tsx
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button type="button" size="sm" />}>
                              <CheckCircle2 className="h-4 w-4" />
                              Aktifkan
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Aktifkan {year.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tahun pelajaran ini akan menjadi periode aktif. {activeYearName ? `${activeYearName} akan diganti sebagai tahun aktif. ` : ""}Workflow terkait akan memakai tahun aktif baru setelah dikonfirmasi.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <form action={setActiveAcademicYearAction}>
                                  <input type="hidden" name="id" value={year.id} />
                                  <AlertDialogAction type="submit">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Aktifkan Tahun
                                  </AlertDialogAction>
                                </form>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
```

- [ ] **Step 3: Confirm the confirmation stays inside `{!year.is_active && (...)}` so active rows never show `Aktifkan`.**

- [ ] **Step 4: Run `npx tsc --noEmit`. Expected: exit 0, no TypeScript errors.**

---

### Task 4: Final Polish And Verification

**Files:**
- Modify: `src/app/dashboard/academic-years/academic-years-client.tsx`
- Modify: `src/app/dashboard/academic-years/page.tsx`

- [ ] **Step 1: Review responsive classes. Keep action buttons stacked on small screens and horizontal on `sm`+.**

Expected action wrapper:

```tsx
<div className="flex flex-col justify-end gap-2 sm:flex-row">
```

- [ ] **Step 2: Run `npx tsc --noEmit`. Expected: exit 0, no TypeScript errors.**

- [ ] **Step 3: Run `npm run build`. Expected: exit 0, no compile/type errors.**

- [ ] **Step 4: Run `git diff -- src/app/dashboard/academic-years/page.tsx src/app/dashboard/academic-years/academic-years-client.tsx`. Expected: only academic-year UI/UX redesign.**

- [ ] **Step 5: Commit plan and implementation.**

```bash
git add src/app/dashboard/academic-years/page.tsx src/app/dashboard/academic-years/academic-years-client.tsx docs/superpowers/plans/2026-06-04-academic-years-ui-ux.md
git commit -m "feat: redesign academic years management ui"
```

Expected: one commit containing the implementation plan and UI redesign.
