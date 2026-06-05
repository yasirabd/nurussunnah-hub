import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  updateEmployeeCurrentPositionAction,
  updateEmployeeProfileAction,
  updateEmployeeRolesAction,
} from "../../actions";
import {
  EmployeeFormFields,
  PositionField,
  RoleCheckboxes,
  type EmployeeFormValue,
  type UnitOption,
} from "../../_components/employee-form-fields";
import { EmployeeSummary, type EmployeeSummaryValue } from "../../_components/employee-summary";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileRow = EmployeeFormValue & EmployeeSummaryValue & {
  id: string;
  home_unit_id: string | null;
  units: { id: string; name: string; code: string } | null;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function EditEmployeePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const queryParams = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: currentRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const currentRoleNames = (currentRoles ?? []).map((item) => item.role);
  const canManageEmployees = currentRoleNames.includes("HRD") || currentRoleNames.includes("ADMIN");
  const canEditPosition = canManageEmployees || currentRoleNames.includes("KEPALA_UNIT");
  if (!canEditPosition) redirect("/dashboard");

  const [{ data: profile }, { data: roles }, { data: position }, { data: units }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, employee_no, email, phone, gender, marital_status, birth_place, birth_date, last_education, study_program, address_ktp, address_domicile, facebook, instagram, twitter, employee_status, active_status, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id),
    supabase
      .from("position_histories")
      .select("position_name")
      .eq("user_id", id)
      .eq("is_current", true)
      .maybeSingle(),
    supabase.from("units").select("id, name, code").order("code", { ascending: true }),
  ]);

  if (!profile) redirect("/dashboard/employees");

  const employee = profile as ProfileRow;
  const roleNames = (roles ?? []).map((item) => item.role);
  const returnTo = `/dashboard/employees/${id}/edit`;
  const success = paramValue(queryParams, "success");
  const error = paramValue(queryParams, "error");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/employees" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-3 w-fit" })}>
        <ArrowLeft className="h-4 w-4" />
        Daftar Pegawai
      </Link>

      <EmployeeSummary employee={employee} roles={roleNames} />

      {success && <Message type="success" text={success} />}
      {error && <Message type="error" text={error} />}

      {canManageEmployees && (
        <form action={updateEmployeeProfileAction} className="space-y-5">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <EmployeeFormFields employee={employee} units={(units ?? []) as UnitOption[]} />
          <div className="flex justify-end">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Simpan Profil
            </Button>
          </div>
        </form>
      )}

      {canManageEmployees && (
        <form action={updateEmployeeRolesAction} className="space-y-5">
          <input type="hidden" name="user_id" value={id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <RoleCheckboxes roles={roleNames} />
          <div className="flex justify-end">
            <Button type="submit">Simpan Role</Button>
          </div>
        </form>
      )}

      <form action={updateEmployeeCurrentPositionAction} className="space-y-5">
        <input type="hidden" name="user_id" value={id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <PositionField positionName={position?.position_name ?? ""} />
        <div className="flex justify-end">
          <Button type="submit">Simpan Jabatan</Button>
        </div>
      </form>
    </div>
  );
}

function Message({ type, text }: { type: "success" | "error"; text: string }) {
  const className = type === "success"
    ? "rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
    : "rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive";
  return <div className={className}>{text}</div>;
}
