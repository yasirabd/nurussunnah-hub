import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Building2, ClipboardPaste, Plus, Upload, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardUserContext } from "@/lib/auth/user-context";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";
import { EmployeeDirectoryTable } from "./employee-directory-table";
import { DirectoryFilterForm } from "./_components/directory-filter-form";
import { DownloadEmployeesExcel } from "./_components/download-employees-excel";
import { PaginationControls } from "./_components/pagination-controls";
import { EmployeesTabs } from "./_components/employees-tabs";

export const metadata: Metadata = { title: "Direktori Pegawai" };

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
  employee_status: EmployeeStatus;
  active_status: ActiveStatus;
  active_status_start_date: string | null;
  active_status_end_date: string | null;
  active_status_note: string | null;
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

type LeaveRow = {
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
};

type UnitRow = { id: string; name: string; code: string };

function paramValue(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function pageSizeValue(value: string) {
  const parsed = positiveInt(value, 10);
  return [10, 25, 50].includes(parsed) ? parsed : 10;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const context = await getDashboardUserContext();
  if (!context) redirect("/auth/login");

  const supabase = context.supabase;
  const roles = context.roles;
  const canManageEmployees = context.isHrd || context.isAdmin;
  const canFilterInactive = canManageEmployees;
  const canOpenDirectory = canManageEmployees || context.isKepalaUnit;
  if (!canOpenDirectory) redirect("/dashboard");

  const q = paramValue(params, "q").trim();
  const unitId = paramValue(params, "unit");
  const requestedActive = paramValue(params, "active") || "active";
  const page = positiveInt(paramValue(params, "page"), 1);
  const pageSize = pageSizeValue(paramValue(params, "pageSize"));
  const success = paramValue(params, "success");
  const errorMessage = paramValue(params, "error");
  const active = canFilterInactive ? requestedActive : "active";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [{ data: allUnits }, { data: myAssignments }, { data: myProfile }] = await Promise.all([
    supabase.from("units").select("id, name, code").order("code", { ascending: true }),
    supabase
      .from("user_unit_assignments")
      .select("unit_id")
      .eq("user_id", context.user.id)
      .eq("assignment_type", "HOME"),
    supabase.from("profiles").select("home_unit_id").eq("id", context.user.id).maybeSingle(),
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
      "id, full_name, employee_no, email, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, active_status, active_status_start_date, active_status_end_date, active_status_note, must_change_password, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)",
      { count: "exact" }
    )
    .order("full_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,employee_no.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (normalizedUnitId) query = query.eq("home_unit_id", normalizedUnitId);
  if (active === "active") query = query.eq("active_status", "AKTIF");
  if (active === "inactive") query = query.neq("active_status", "AKTIF");

  let exportQuery = supabase
    .from("profiles")
    .select(
      "id, full_name, employee_no, email, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, active_status, active_status_start_date, active_status_end_date, active_status_note, must_change_password, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)"
    )
    .order("full_name", { ascending: true });

  if (q) {
    exportQuery = exportQuery.or(`full_name.ilike.%${q}%,employee_no.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (normalizedUnitId) exportQuery = exportQuery.eq("home_unit_id", normalizedUnitId);
  if (active === "active") exportQuery = exportQuery.eq("active_status", "AKTIF");
  if (active === "inactive") exportQuery = exportQuery.neq("active_status", "AKTIF");

  const { data: profiles, error, count } = await query;
  const { data: exportProfiles } = await exportQuery;
  const rows = (profiles ?? []) as ProfileRow[];
  const exportRows = (exportProfiles ?? []) as ProfileRow[];
  const ids = rows.map((row) => row.id);
  const exportIds = exportRows.map((row) => row.id);
  const totalRows = count ?? 0;

  const { data: userRoles } = ids.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] };

  const { data: exportUserRoles } = exportIds.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", exportIds)
    : { data: [] };

  const { data: activeLeaves } = ids.length
    ? await supabase
        .from("employee_leaves")
        .select("user_id, start_date, end_date, reason")
        .eq("status", "ACTIVE")
        .in("user_id", ids)
    : { data: [] };

  const rolesByUser = groupByUser(userRoles ?? []);
  const exportRolesByUser = groupByUser(exportUserRoles ?? []);
  const activeLeavesByUser = Object.fromEntries(
    ((activeLeaves ?? []) as LeaveRow[]).map((leave) => [leave.user_id, leave])
  );
  const activeCount = rows.filter((row) => row.active_status === "AKTIF").length;
  const unitCount = new Set(rows.map((row) => row.units?.id).filter(Boolean)).size;
  const flatParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""])
  );
  const { count: pendingRegCount } = canManageEmployees
    ? await supabase
        .from("employee_registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", "MENUNGGU")
    : { count: 0 };

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
          {totalRows} pegawai ditemukan
        </Badge>
        {canManageEmployees && (
          <div className="flex gap-2">
            <Link
              href="/dashboard/employees/intake"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ClipboardPaste className="h-4 w-4" />
              Intake Form
            </Link>
            <Link
              href="/dashboard/employees/import"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Upload className="h-4 w-4" />
              Import Massal
            </Link>
            <Link
              href="/dashboard/employees/new"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="h-4 w-4" />
              Tambah Pegawai
            </Link>
          </div>
        )}
      </div>

      <EmployeesTabs pendingCount={pendingRegCount ?? 0} />
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
        <MetricCard icon={Users} label="Total hasil filter" value={String(totalRows)} />
        <MetricCard icon={Users} label="Aktif di halaman ini" value={String(activeCount)} />
        <MetricCard icon={Building2} label="Unit di halaman ini" value={String(unitCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Direktori</CardTitle>
          <CardDescription>Cari berdasarkan nama, NIY, email, unit, atau status aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          <DirectoryFilterForm
            q={q}
            unitId={normalizedUnitId}
            active={active}
            pageSize={pageSize}
            units={units ?? []}
            canManageEmployees={canManageEmployees}
            canFilterInactive={canFilterInactive}
          />
        </CardContent>
      </Card>

            <Card>
        <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Daftar Pegawai</CardTitle>
                <CardDescription>
                  {totalRows} pegawai ditemukan
                  {(q || unitId || active !== "active") && (
                    <Link href="/dashboard/employees" className="ml-2 text-sm font-medium text-primary">
                      Reset filter
                    </Link>
                  )}
                </CardDescription>
              </div>
              <DownloadEmployeesExcel
                rows={exportRows}
                rolesByUser={Object.fromEntries(exportRolesByUser)}
              />
            </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          ) : (
            <EmployeeDirectoryTable
              rows={rows}
              rolesByUser={Object.fromEntries(rolesByUser)}
              activeLeavesByUser={activeLeavesByUser}
              units={units}
              canManageEmployees={canManageEmployees}
              canEditPosition={canManageEmployees || roles.includes("KEPALA_UNIT")}
              canResetPassword={context.isAdmin}
            />
          )}
          <div className="mt-4">
            <PaginationControls page={page} pageSize={pageSize} total={totalRows} searchParams={flatParams} />
          </div>
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
