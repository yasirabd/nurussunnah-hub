"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWith(ok: boolean, message: string): never {
  const key = ok ? "success" : "error";
  redirect(`/dashboard/units?${key}=${encodeURIComponent(message)}`);
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!(roles ?? []).some((item) => item.role === "ADMIN")) redirect("/dashboard");

  return supabase;
}

export async function updateOrganizationAction(formData: FormData) {
  const supabase = await ensureAdmin();

  const { error } = await supabase
    .from("organizations")
    .update({
      name: text(formData, "name"),
      description: text(formData, "description") || null,
    })
    .eq("id", text(formData, "id"));

  revalidatePath("/dashboard/units");
  redirectWith(!error, error ? error.message : "Organisasi berhasil diperbarui.");
}

export async function createUnitAction(formData: FormData) {
  const supabase = await ensureAdmin();

  const { error } = await supabase.from("units").insert({
    organization_id: text(formData, "organization_id"),
    name: text(formData, "name"),
    code: text(formData, "code").toUpperCase(),
    is_active: formData.get("is_active") === "on",
  });

  revalidatePath("/dashboard/units");
  redirectWith(!error, error ? error.message : "Unit berhasil dibuat.");
}

export async function updateUnitAction(formData: FormData) {
  const supabase = await ensureAdmin();

  const { error } = await supabase
    .from("units")
    .update({
      name: text(formData, "name"),
      code: text(formData, "code").toUpperCase(),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", text(formData, "id"));

  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard/employees");
  redirectWith(!error, error ? error.message : "Unit berhasil diperbarui.");
}
