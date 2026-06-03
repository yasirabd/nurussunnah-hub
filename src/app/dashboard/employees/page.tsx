import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Search, Users } from "lucide-react";

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
import { createClient } from "@/lib/supabase/server";
import { EmployeeDirectoryTable } from "./employee-directory-table";

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
  gender: "L" | "P";
  marital_status: string | null;
  birth_place: string | null;
  birth_date: string | null;
  last_education: string | null;
  study_program: string | null;
  address_ktp: string | null;
  address_domicile: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  employee_status: string;
  is_active: boolean;
  must_change_password: boolean;
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
  const normalizedUnitId = canManageEmployees
    ? unitId
    : allowedUnitIds.includes(unitId)
      ? unitId
      : units[0]?.id ?? "";

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, employee_no, email, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, is_active, must_change_password, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)"
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
              {canManageEmployees && <option value="">Semua unit</option>}
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
            {rows.length} pegawai ditemukan
            {(q || unitId || active !== "active") && (
              <Link href="/dashboard/employees" className="ml-2 text-sm font-medium text-primary">
                Reset filter
              </Link>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          ) : (
            <EmployeeDirectoryTable
              rows={rows}
              rolesByUser={Object.fromEntries(rolesByUser)}
              positionsByUser={Object.fromEntries(positionsByUser)}
              units={units}
              canManageEmployees={canManageEmployees}
              canEditPosition={canManageEmployees || roles.includes("KEPALA_UNIT")}
            />
          )}
        </CardContent>
      </Card>
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
