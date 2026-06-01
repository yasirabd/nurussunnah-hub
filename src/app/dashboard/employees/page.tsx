import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Building2, Mail, Phone, Search, Users } from "lucide-react";

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
  updateEmployeeCurrentPositionAction,
  updateEmployeeProfileAction,
  updateEmployeeRolesAction,
} from "./actions";

export const metadata: Metadata = { title: "Direktori Pegawai - Nurussunnah Hub" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileRow = {
  id: string;
  full_name: string;
  employee_no: string;
  home_unit_id: string | null;
  email: string;
  phone: string | null;
  employee_status: string;
  is_active: boolean;
  units: { id: string; name: string; code: string } | null;
};

type RoleRow = {
  user_id: string;
  role: string;
};

type PositionRow = {
  user_id: string;
  position_name: string;
};

type UnitRow = { id: string; name: string; code: string };

function paramValue(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    TETAP: "Tetap",
    TIDAK_TETAP: "Tidak Tetap",
    KONTRAK: "Kontrak",
    HONORER: "Honorer",
    PENSIUN: "Pensiun",
  };

  return labels[status] ?? status;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
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
  const canManageEmployees = roles.includes("HRD") || roles.includes("ADMIN");
  const canFilterInactive = canManageEmployees;
  const canOpenDirectory =
    roles.includes("HRD") || roles.includes("ADMIN") || roles.includes("KEPALA_UNIT");
  if (!canOpenDirectory) redirect("/dashboard");

  const q = paramValue(params, "q").trim();
  const unitId = paramValue(params, "unit");
  const requestedActive = paramValue(params, "active") || "active";
  const success = paramValue(params, "success");
  const errorMessage = paramValue(params, "error");
  const active = canFilterInactive ? requestedActive : "active";

  const [{ data: allUnits }, { data: myAssignments }, { data: myProfile }] = await Promise.all([
    supabase.from("units").select("id, name, code").order("code", { ascending: true }),
    supabase
      .from("user_unit_assignments")
      .select("unit_id")
      .eq("user_id", user.id)
      .eq("assignment_type", "HOME"),
    supabase.from("profiles").select("home_unit_id").eq("id", user.id).maybeSingle(),
  ]);

  const allowedUnitIds = canManageEmployees
    ? []
    : Array.from(
        new Set(
          [
            ...(myAssignments ?? []).map((item) => item.unit_id).filter(Boolean),
            myProfile?.home_unit_id,
          ].filter((id): id is string => Boolean(id))
        )
      );
  const units = canManageEmployees
    ? ((allUnits ?? []) as UnitRow[])
    : ((allUnits ?? []) as UnitRow[]).filter((unit) => allowedUnitIds.includes(unit.id));
  const normalizedUnitId = canManageEmployees || allowedUnitIds.includes(unitId) ? unitId : "";

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, employee_no, email, phone, employee_status, is_active, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)"
    )
    .order("full_name", { ascending: true });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,employee_no.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (normalizedUnitId) query = query.eq("home_unit_id", normalizedUnitId);
  if (active === "active") query = query.eq("is_active", true);
  if (active === "inactive") query = query.eq("is_active", false);

  const { data: profiles, error } = await query;
  const rows = (profiles ?? []) as ProfileRow[];
  const ids = rows.map((row) => row.id);

  const { data: userRoles } = ids.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] };

  const { data: positions } = ids.length
    ? await supabase
        .from("position_histories")
        .select("user_id, position_name")
        .eq("is_current", true)
        .in("user_id", ids)
        .order("position_name", { ascending: true })
    : { data: [] };

  const rolesByUser = groupByUser(userRoles ?? []);
  const positionsByUser = groupByUser(positions ?? []);
  const activeCount = rows.filter((row) => row.is_active).length;
  const unitCount = new Set(rows.map((row) => row.units?.id).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Direktori Pegawai</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Data pegawai lintas unit mengikuti cakupan akses role aktif.
          </p>
        </div>
        <Badge className="h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
          {rows.length} pegawai tampil
        </Badge>
      </div>

      {success && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {success}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Users} label="Pegawai tampil" value={String(rows.length)} />
        <MetricCard icon={Users} label="Pegawai aktif" value={String(activeCount)} />
        <MetricCard icon={Building2} label="Unit tercakup" value={String(unitCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Direktori</CardTitle>
          <CardDescription>Cari berdasarkan nama, NIY, email, unit, atau status aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} className="pl-9" placeholder="Cari pegawai" />
            </div>
            <select
              name="unit"
              defaultValue={normalizedUnitId}
              className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua unit</option>
              {(units ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </select>
            <select
              name="active"
              defaultValue={active}
              className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm"
            >
              <option value="active">Aktif</option>
              {canFilterInactive && <option value="inactive">Non-aktif</option>}
              {canFilterInactive && <option value="all">Semua status</option>}
            </select>
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pegawai</CardTitle>
          <CardDescription>
            HRD/Admin melihat lintas unit; Kepala Unit mengikuti kebijakan RLS unitnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error.message}
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada pegawai sesuai filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pegawai</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-52">
                        <p className="font-medium">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground">NIY {row.employee_no}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-40">
                        <p>{row.units?.name ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">{row.units?.code ?? "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-56 space-y-2">
                        <PillList values={positionsByUser.get(row.id) ?? []} fallback="-" />
                        {(canManageEmployees || roles.includes("KEPALA_UNIT")) && (
                          <form action={updateEmployeeCurrentPositionAction} className="flex gap-2">
                            <input type="hidden" name="user_id" value={row.id} />
                            <Input
                              name="position_name"
                              defaultValue={(positionsByUser.get(row.id) ?? [""])[0]}
                              placeholder="Jabatan aktif"
                              className="h-9 min-w-40"
                            />
                            <Button type="submit" variant="outline" size="sm">
                              Simpan
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PillList values={rolesByUser.get(row.id) ?? []} fallback="PEGAWAI" />
                    </TableCell>
                    <TableCell>
                      <div className="min-w-56 space-y-1 text-sm">
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.email}
                        </p>
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {row.phone || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={row.is_active ? "default" : "secondary"} className="w-fit">
                          {row.is_active ? "Aktif" : "Non-aktif"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(row.employee_status)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {canManageEmployees && (
        <Card>
          <CardHeader>
            <CardTitle>Kelola Pegawai</CardTitle>
            <CardDescription>HRD/Admin dapat memperbarui data operasional dan role pegawai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="rounded-[var(--radius-md)] border p-4">
                <form action={updateEmployeeProfileAction} className="grid gap-3 lg:grid-cols-4">
                  <input type="hidden" name="id" value={row.id} />
                  <Input name="full_name" defaultValue={row.full_name} placeholder="Nama" />
                  <Input name="employee_no" defaultValue={row.employee_no} placeholder="NIY" />
                  <Input name="email" defaultValue={row.email} placeholder="Email" />
                  <Input name="phone" defaultValue={row.phone ?? ""} placeholder="No. HP" />
                  <select name="employee_status" defaultValue={row.employee_status} className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm">
                    <option value="TETAP">Tetap</option>
                    <option value="TIDAK_TETAP">Tidak Tetap</option>
                    <option value="KONTRAK">Kontrak</option>
                    <option value="HONORER">Honorer</option>
                    <option value="PENSIUN">Pensiun</option>
                  </select>
                  <select name="home_unit_id" defaultValue={row.home_unit_id ?? ""} className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm">
                    <option value="">Tanpa unit</option>
                    {(units ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked={row.is_active} /> Aktif</label>
                  <Button type="submit">Simpan data</Button>
                </form>
                <form action={updateEmployeeRolesAction} className="mt-3 flex flex-wrap items-center gap-3">
                  <input type="hidden" name="user_id" value={row.id} />
                  {['PEGAWAI', 'KEPALA_UNIT', 'HRD', 'ADMIN'].map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm"><input name={role} type="checkbox" defaultChecked={(rolesByUser.get(row.id) ?? []).includes(role)} /> {role}</label>
                  ))}
                  <Button type="submit" variant="outline" size="sm">Simpan role</Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function groupByUser(rows: RoleRow[] | PositionRow[]) {
  const grouped = new Map<string, string[]>();

  rows.forEach((row) => {
    const value = "role" in row ? row.role : row.position_name;
    const existing = grouped.get(row.user_id) ?? [];
    grouped.set(row.user_id, [...existing, value]);
  });

  return grouped;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PillList({ values, fallback }: { values: string[]; fallback: string }) {
  if (!values.length) return <span className="text-sm text-muted-foreground">{fallback}</span>;

  return (
    <div className="flex min-w-44 flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary" className="font-normal">
          {value}
        </Badge>
      ))}
    </div>
  );
}






