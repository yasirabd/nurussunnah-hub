import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getDashboardUserContext } from "@/lib/auth/user-context";
import { UnitsClient } from "./units-client";

export const metadata: Metadata = { title: "Unit & Organisasi" };

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
  const context = await getDashboardUserContext();
  if (!context) redirect("/auth/login");
  if (!context.isAdmin) redirect("/dashboard");

  const [{ data: organizations }, { data: units, error }] = await Promise.all([
    context.supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: true }),
    context.supabase
      .from("units")
      .select("*, organizations(name)")
      .order("code", { ascending: true }),
  ]);

  const organization = organizations?.[0] ?? null;
  const activeUnits = (units ?? []).filter((unit) => unit.is_active).length;

  return (
    <UnitsClient
      organization={organization}
      units={units ?? []}
      activeUnits={activeUnits}
      successMessage={messageValue(params, "success")}
      errorMessage={messageValue(params, "error")}
      queryError={error?.message}
    />
  );
}
