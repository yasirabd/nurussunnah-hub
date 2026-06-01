import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CheckCircle2 } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import {
  createAcademicYearAction,
  setActiveAcademicYearAction,
  updateAcademicYearAction,
} from "./actions";

export const metadata: Metadata = { title: "Tahun Pelajaran - Nurussunnah Hub" };

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AcademicYearsPage({ searchParams }: PageProps) {
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

  const roles = (roleData ?? []).map((item) => item.role);
  const canManage = roles.includes("HRD") || roles.includes("ADMIN");
  if (!canManage) redirect("/dashboard");

  const { data: years, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });

  const activeYear = (years ?? []).find((year) => year.is_active);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Tahun Pelajaran</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Kelola periode akademik yang dipakai surat kerja, feedback, dan penugasan unit.
          </p>
        </div>
        {activeYear && (
          <Badge className="h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
            Aktif: {activeYear.name}
          </Badge>
        )}
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
        <Card>
          <CardHeader>
            <CardTitle>Tambah Tahun Pelajaran</CardTitle>
            <CardDescription>Gunakan format nama seperti 2026/2027.</CardDescription>
          </CardHeader>
          <CardContent>
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
              <Button type="submit" className="w-full">
                <CalendarDays className="h-4 w-4" />
                Simpan tahun pelajaran
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Tahun Pelajaran</CardTitle>
            <CardDescription>Hanya satu tahun yang seharusnya aktif untuk workflow berjalan.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </p>
            ) : !years?.length ? (
              <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada tahun pelajaran.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell>
                        <form id={`year-${year.id}`} action={updateAcademicYearAction}>
                          <input type="hidden" name="id" value={year.id} />
                          <Input name="name" defaultValue={year.name} className="min-w-32" />
                        </form>
                      </TableCell>
                      <TableCell>
                        <div className="grid min-w-64 gap-2 sm:grid-cols-2">
                          <Input
                            form={`year-${year.id}`}
                            name="start_date"
                            type="date"
                            defaultValue={year.start_date}
                          />
                          <Input
                            form={`year-${year.id}`}
                            name="end_date"
                            type="date"
                            defaultValue={year.end_date}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(year.start_date)} - {formatDate(year.end_date)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={year.is_active ? "default" : "secondary"}>
                          {year.is_active ? "Aktif" : "Arsip"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button type="submit" form={`year-${year.id}`} variant="outline" size="sm">
                            Simpan
                          </Button>
                          {!year.is_active && (
                            <form action={setActiveAcademicYearAction}>
                              <input type="hidden" name="id" value={year.id} />
                              <Button type="submit" size="sm">
                                <CheckCircle2 className="h-4 w-4" />
                                Aktifkan
                              </Button>
                            </form>
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
