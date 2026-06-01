import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/server";
import { createUnitAction, updateOrganizationAction, updateUnitAction } from "./actions";

export const metadata: Metadata = { title: "Unit & Organisasi - Nurussunnah Hub" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function messageValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: "success" | "error"
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!(roleData ?? []).some((item) => item.role === "ADMIN")) redirect("/dashboard");

  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: units, error } = await supabase
    .from("units")
    .select("*, organizations(name)")
    .order("code", { ascending: true });

  const organization = organizations?.[0] ?? null;
  const activeUnits = (units ?? []).filter((unit) => unit.is_active).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Unit & Organisasi</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Kelola entitas yayasan dan unit sekolah yang dipakai profil pegawai.
          </p>
        </div>
        <Badge className="h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
          {activeUnits} unit aktif
        </Badge>
      </div>

      {messageValue(params, "success") && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {messageValue(params, "success")}
        </div>
      )}
      {messageValue(params, "error") && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {messageValue(params, "error")}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisasi</CardTitle>
              <CardDescription>Entitas induk untuk seluruh unit.</CardDescription>
            </CardHeader>
            <CardContent>
              {organization ? (
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
                  <Button type="submit" className="w-full">
                    <Building2 className="h-4 w-4" />
                    Simpan organisasi
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Organisasi belum tersedia.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tambah Unit</CardTitle>
              <CardDescription>Kode unit wajib unik, contoh TK, SD, YAYASAN.</CardDescription>
            </CardHeader>
            <CardContent>
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
                <Button type="submit" className="w-full" disabled={!organization}>
                  <Plus className="h-4 w-4" />
                  Tambah unit
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Unit</CardTitle>
            <CardDescription>Unit aktif dipakai untuk assignment, profil, feedback, dan review.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </p>
            ) : !units?.length ? (
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
                    <TableRow key={unit.id}>
                      <TableCell>
                        <form id={`unit-${unit.id}`} action={updateUnitAction}>
                          <input type="hidden" name="id" value={unit.id} />
                          <Input name="code" defaultValue={unit.code} className="w-24" required />
                        </form>
                      </TableCell>
                      <TableCell>
                        <Input
                          form={`unit-${unit.id}`}
                          name="name"
                          defaultValue={unit.name}
                          className="min-w-48"
                          required
                        />
                      </TableCell>
                      <TableCell>{unit.organizations?.name ?? "-"}</TableCell>
                      <TableCell>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            form={`unit-${unit.id}`}
                            name="is_active"
                            type="checkbox"
                            defaultChecked={unit.is_active}
                            className="h-4 w-4 rounded border-input"
                          />
                          {unit.is_active ? "Aktif" : "Non-aktif"}
                        </label>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="submit" form={`unit-${unit.id}`} variant="outline" size="sm">
                          Simpan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
