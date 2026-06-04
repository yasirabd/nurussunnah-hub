import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getDashboardUserContext } from "@/lib/auth/user-context";
import { AcademicYearsClient } from "./academic-years-client";

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

export default async function AcademicYearsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const context = await getDashboardUserContext();
  if (!context) redirect("/auth/login");

  const canManage = context.isHrd || context.isAdmin;
  if (!canManage) redirect("/dashboard");

  const { data: years, error } = await context.supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });

  const activeYear = (years ?? []).find((year) => year.is_active);

  return (
    <AcademicYearsClient
      years={years ?? []}
      activeYearName={activeYear?.name}
      successMessage={messageValue(params, "success")}
      errorMessage={messageValue(params, "error")}
      queryError={error?.message}
    />
  );
}
