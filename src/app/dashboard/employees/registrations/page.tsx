import type { Metadata } from "next";

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
import { getDashboardUserContext } from "@/lib/auth/user-context";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/employee-status";
import { EmployeesTabs } from "../_components/employees-tabs";
import { generateInviteAction } from "./actions";
import { InviteList, type Invite } from "./_components/invite-list";
import { RegistrationReview, type RegistrationDetail } from "./_components/registration-review";

export const metadata: Metadata = { title: "Validasi Pendaftaran" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(sp: Record<string, string | string[] | undefined>, k: string) {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

export default async function RegistrationsPage({ searchParams }: PageProps) {
  const ctx = await getDashboardUserContext();
  if (!ctx) return null;

  const { supabase, isHrd, isAdmin } = ctx;
  if (!isHrd && !isAdmin) return null;

  const sp = (await searchParams) ?? {};
  const success = param(sp, "success");
  const error = param(sp, "error");

  const { data: pending } = await supabase
    .from("employee_registrations")
    .select(
      "id, full_name, email, nik, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, position_name, uniform_size, emergency_name, emergency_relation, emergency_phone, ktp_url, photo_url, note, home_unit_id, created_at, units:home_unit_id (code, name)"
    )
    .eq("status", "MENUNGGU")
    .order("created_at", { ascending: true });

  const rows = pending ?? [];

  const { data: inviteRows } = await supabase
    .from("employee_invites")
    .select("id, code, status, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const invites: Invite[] = (inviteRows ?? []).map((inv) => ({
    id: inv.id,
    code: inv.code,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    status: inv.status,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Direktori Pegawai</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Kelola data pegawai dan validasi pendaftaran calon pegawai baru.
        </p>
      </div>

      <EmployeesTabs pendingCount={rows.length} />

      {success && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Kode Undangan</CardTitle>
            <CardDescription>
              Buat kode sekali pakai (berlaku 7 hari) lalu bagikan tautannya ke calon pegawai.
            </CardDescription>
          </div>
          <form action={generateInviteAction}>
            <Button type="submit" size="sm">Buat Kode Undangan</Button>
          </form>
        </CardHeader>
        <CardContent>
          <InviteList invites={invites} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menunggu Validasi</CardTitle>
          <CardDescription>{rows.length} pendaftaran menunggu.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada pendaftaran yang menunggu.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const unit = Array.isArray(r.units) ? r.units[0] : r.units;
                  const unitLabel = unit ? `${unit.code} - ${unit.name}` : null;
                  const detail: RegistrationDetail = {
                    id: r.id,
                    full_name: r.full_name,
                    email: r.email,
                    nik: r.nik,
                    phone: r.phone,
                    gender: r.gender,
                    marital_status: r.marital_status,
                    birth_place: r.birth_place,
                    birth_date: r.birth_date,
                    last_education: r.last_education,
                    study_program: r.study_program,
                    address_ktp: r.address_ktp,
                    address_domicile: r.address_domicile,
                    facebook: r.facebook,
                    instagram: r.instagram,
                    twitter: r.twitter,
                    employee_status: EMPLOYEE_STATUS_LABELS[r.employee_status] ?? r.employee_status,
                    position_name: r.position_name,
                    uniform_size: r.uniform_size,
                    emergency_name: r.emergency_name,
                    emergency_relation: r.emergency_relation,
                    emergency_phone: r.emergency_phone,
                    ktp_url: r.ktp_url,
                    photo_url: r.photo_url,
                    note: r.note,
                    unit_label: unitLabel,
                  };
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.full_name}</div>
                        {r.position_name && (
                          <div className="text-xs text-muted-foreground">{r.position_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{r.email}</div>
                        {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{unitLabel ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {EMPLOYEE_STATUS_LABELS[r.employee_status] ?? r.employee_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RegistrationReview reg={detail} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
