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
      <DialogTrigger
        render={<Button type="button" className="w-full sm:w-fit" disabled={!organization} />}
      >
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
            <input
              name="is_active"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-input"
            />
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
            <Textarea
              name="description"
              defaultValue={organization.description ?? ""}
              className="min-h-24"
            />
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
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={unit.is_active}
              className="h-4 w-4 rounded border-input"
            />
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
