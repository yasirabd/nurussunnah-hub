import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createEmployeeAction } from "../actions";
import {
  EmployeeFormFields,
  PositionField,
  RoleCheckboxes,
  type AcademicYearOption,
  type UnitOption,
} from "../_components/employee-form-fields";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function NewEmployeePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roleNames = (roles ?? []).map((item) => item.role);
  if (!roleNames.includes("HRD") && !roleNames.includes("ADMIN")) redirect("/dashboard");

  const [{ data: units }, { data: academicYears }, { data: employeeNos }] = await Promise.all([
    supabase.from("units").select("id, name, code").order("code", { ascending: true }),
    supabase.from("academic_years").select("id, start_date, end_date").order("start_date"),
    supabase.from("profiles").select("employee_no"),
  ]);
  const existingEmployeeNos = (employeeNos ?? []).map((item) => item.employee_no);

  const success = paramValue(params, "success");
  const error = paramValue(params, "error");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/employees" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-3 -ml-3 w-fit" })}>
            <ArrowLeft className="h-4 w-4" />
            Daftar Pegawai
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">Tambah Pegawai</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Buat akun login, profil, role, unit, dan jabatan awal pegawai.
          </p>
        </div>
      </div>

      {success && <Message type="success" text={success} />}
      {error && <Message type="error" text={error} />}

      <form action={createEmployeeAction} className="space-y-5">
        <input type="hidden" name="return_to" value="/dashboard/employees/new" />
        <EmployeeFormFields
          units={(units ?? []) as UnitOption[]}
          academicYears={(academicYears ?? []) as AcademicYearOption[]}
          existingEmployeeNos={existingEmployeeNos}
          showDefaultPasswordHelp
        />
        <RoleCheckboxes roles={["PEGAWAI"]} />
        <PositionField />
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Link href="/dashboard/employees" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Tambah Pegawai
          </Button>
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
