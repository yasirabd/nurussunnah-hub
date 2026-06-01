"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWith(ok: boolean, message: string): never {
  const key = ok ? "success" : "error";
  redirect(`/dashboard/academic-years?${key}=${encodeURIComponent(message)}`);
}

async function ensureCanManageAcademicYears() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const canManage = (roles ?? []).some((item) => item.role === "HRD" || item.role === "ADMIN");
  if (!canManage) redirect("/dashboard");

  return supabase;
}

export async function createAcademicYearAction(formData: FormData) {
  const supabase = await ensureCanManageAcademicYears();
  const isActive = formData.get("is_active") === "on";

  if (isActive) {
    const { error } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .eq("is_active", true);

    if (error) redirectWith(false, error.message);
  }

  const { error } = await supabase.from("academic_years").insert({
    name: text(formData, "name"),
    start_date: text(formData, "start_date"),
    end_date: text(formData, "end_date"),
    is_active: isActive,
  });

  revalidatePath("/dashboard/academic-years");
  redirectWith(!error, error ? error.message : "Tahun pelajaran berhasil dibuat.");
}

export async function setActiveAcademicYearAction(formData: FormData) {
  const supabase = await ensureCanManageAcademicYears();
  const id = text(formData, "id");

  const { error: deactivateError } = await supabase
    .from("academic_years")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError) redirectWith(false, deactivateError.message);

  const { error } = await supabase
    .from("academic_years")
    .update({ is_active: true })
    .eq("id", id);

  revalidatePath("/dashboard/academic-years");
  revalidatePath("/dashboard");
  redirectWith(!error, error ? error.message : "Tahun pelajaran aktif berhasil diperbarui.");
}

export async function updateAcademicYearAction(formData: FormData) {
  const supabase = await ensureCanManageAcademicYears();
  const id = text(formData, "id");

  const { error } = await supabase
    .from("academic_years")
    .update({
      name: text(formData, "name"),
      start_date: text(formData, "start_date"),
      end_date: text(formData, "end_date"),
    })
    .eq("id", id);

  revalidatePath("/dashboard/academic-years");
  redirectWith(!error, error ? error.message : "Tahun pelajaran berhasil diperbarui.");
}
