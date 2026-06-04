import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { UnitsClient } from "./units-client";

export const metadata: Metadata = { title: "Unit & Organisasi - Nurussunnah Hub" };

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!(roleData ?? []).some((item) => item.role === "ADMIN")) redirect("/dashboard");

  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: units, error } = await supabase
    .from("units")
    .select("*, organizations(name)")
    .order("code", { ascending: true });

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
