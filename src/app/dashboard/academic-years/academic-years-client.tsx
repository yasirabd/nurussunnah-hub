"use client";

import type { ReactNode } from "react";
import { formatDateWIB } from '@/lib/timezone';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAcademicYearAction,
  setActiveAcademicYearAction,
  updateAcademicYearAction,
} from "./actions";

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
  return formatDateWIB(value);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
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
          <AddYearDialog />
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
                        <EditYearDialog year={year} />
                        {!year.is_active && (
                          <ActivateYearDialog year={year} activeYearName={activeYearName} />
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

function AddYearDialog() {
  return (
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
            <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
            <Button type="submit">
              <CalendarDays className="h-4 w-4" />
              Simpan Tahun
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditYearDialog({ year }: { year: AcademicYearRow }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil className="h-4 w-4" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tahun Pelajaran</DialogTitle>
          <DialogDescription>Perbarui nama dan rentang tanggal tahun pelajaran.</DialogDescription>
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
            <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
            <Button type="submit">Simpan Perubahan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActivateYearDialog({
  year,
  activeYearName,
}: {
  year: AcademicYearRow;
  activeYearName?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" size="sm" />}>
        <CheckCircle2 className="h-4 w-4" />
        Aktifkan
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={setActiveAcademicYearAction}>
          <input type="hidden" name="id" value={year.id} />
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan {year.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tahun pelajaran ini akan menjadi periode aktif. {activeYearName ? `${activeYearName} akan diganti sebagai tahun aktif. ` : ""}
              Workflow terkait akan memakai tahun aktif baru setelah dikonfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction type="submit">
              <CheckCircle2 className="h-4 w-4" />
              Aktifkan Tahun
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
