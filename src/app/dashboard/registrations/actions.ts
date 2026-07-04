"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_EMPLOYEE_PASSWORD = "bismillahns";

function redirectWith(ok: boolean, message: string): never {
  redirect(`/dashboard/registrations?${ok ? "success" : "error"}=${encodeURIComponent(message)}`);
}

async function ensureHrdAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((r) => r.role);
  if (!roles.includes("HRD") && !roles.includes("ADMIN")) redirect("/dashboard");
  return { supabase, reviewerId: user.id };
}

export async function approveRegistrationAction(formData: FormData) {
  const { supabase, reviewerId } = await ensureHrdAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirectWith(false, "ID pendaftaran tidak valid.");

  const { data: reg, error: fetchError } = await supabase
    .from("employee_registrations")
    .select("*")
    .eq("id", id)
    .eq("status", "MENUNGGU")
    .maybeSingle();
  if (fetchError) redirectWith(false, fetchError.message);
  if (!reg) redirectWith(false, "Pendaftaran tidak ditemukan atau sudah diproses.");

  // Guard against races: reject if employee already exists.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .or(`employee_no.eq.${reg.employee_no},email.eq.${reg.email}`)
    .maybeSingle();
  if (existing) redirectWith(false, "NIY atau email sudah terdaftar sebagai pegawai.");

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: reg.email,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: reg.full_name,
      employee_no: reg.employee_no,
      gender: reg.gender,
    },
  });
  if (authError || !authData.user?.id) {
    redirectWith(false, authError?.message ?? "Gagal membuat akun login pegawai.");
  }
  const userId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: reg.full_name,
    employee_no: reg.employee_no,
    email: reg.email,
    phone: reg.phone,
    gender: reg.gender,
    marital_status: reg.marital_status,
    birth_place: reg.birth_place,
    birth_date: reg.birth_date,
    last_education: reg.last_education,
    study_program: reg.study_program,
    address_ktp: reg.address_ktp,
    address_domicile: reg.address_domicile,
    home_unit_id: reg.home_unit_id,
    employee_status: reg.employee_status,
    active_status: "AKTIF",
    must_change_password: true,
  });
  if (profileError) redirectWith(false, profileError.message);

  await supabase.from("user_roles").insert({ user_id: userId, role: "PEGAWAI" });

  if (reg.home_unit_id) {
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    if (activeYear?.id) {
      await supabase.from("user_unit_assignments").upsert(
        {
          user_id: userId,
          unit_id: reg.home_unit_id,
          assignment_type: "HOME",
          academic_year_id: activeYear.id,
        },
        { onConflict: "user_id,unit_id,assignment_type,academic_year_id" }
      );
    }
  }

  await supabase
    .from("employee_registrations")
    .update({ status: "DISETUJUI", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard/employees");
  redirectWith(true, `Pendaftaran ${reg.full_name} divalidasi. Akun dibuat (password: bismillahns).`);
}

export async function rejectRegistrationAction(formData: FormData) {
  const { supabase } = await ensureHrdAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirectWith(false, "ID pendaftaran tidak valid.");

  // Not validated -> delete the record entirely.
  const { error } = await supabase.from("employee_registrations").delete().eq("id", id);
  if (error) redirectWith(false, error.message);

  revalidatePath("/dashboard/registrations");
  redirectWith(true, "Pendaftaran ditolak dan datanya dihapus.");
}

export async function generateInviteAction() {
  const { supabase } = await ensureHrdAdmin();
  const { error } = await supabase.rpc("generate_employee_invite");
  if (error) redirectWith(false, error.message);
  revalidatePath("/dashboard/registrations");
  redirectWith(true, "Kode undangan baru dibuat. Bagikan tautannya ke calon pegawai.");
}
