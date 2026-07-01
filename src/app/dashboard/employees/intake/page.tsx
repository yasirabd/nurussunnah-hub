import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { IntakeFormClient } from "../_components/intake-form-client";
import type { UnitOption } from "../_components/employee-form-fields";

export const metadata: Metadata = { title: "Intake Penawaran Kerja" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function IntakePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roleNames = (roles ?? []).map((item) => item.role);
  if (!roleNames.includes("HRD") && !roleNames.includes("ADMIN")) redirect("/dashboard");

  const { data: units } = await supabase
    .from("units")
    .select("id, name, code")
    .order("code", { ascending: true });

  const { data: niyRows } = await supabase
    .from("profiles")
    .select("employee_no");
  const existingNiys = (niyRows ?? []).map((r) => r.employee_no).filter(Boolean) as string[];

  const success = paramValue(params, "success");
  const error = paramValue(params, "error");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/dashboard/employees"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-3 -ml-3 w-fit" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Daftar Pegawai
        </Link>
        <h1 className="text-2xl font-semibold tracking-normal">Intake Penawaran Kerja</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tempel satu baris respons Google Form untuk mengisi otomatis, verifikasi data,
          lalu buat akun pegawai baru beserta data intake (kontak darurat, seragam, dokumen).
        </p>
      </div>

      {success && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{success}</div>
      )}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <IntakeFormClient units={(units ?? []) as UnitOption[]} existingNiys={existingNiys} />
    </div>
  );
}
