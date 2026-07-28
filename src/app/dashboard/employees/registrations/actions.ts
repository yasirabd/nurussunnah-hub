"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildNiy, nextSequence } from "@/lib/niy.mjs";
import { normalizeRegistrationApproval } from "@/lib/registration-review.mjs";
import { moveAndRenameFolder, employeeDocumentRootFolderId } from "@/lib/google-drive";

const DEFAULT_EMPLOYEE_PASSWORD = "bismillahns";
const BASE = "/dashboard/employees/registrations";

function redirectWith(ok: boolean, message: string): never {
  redirect(`${BASE}?${ok ? "success" : "error"}=${encodeURIComponent(message)}`);
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

  const normalized = normalizeRegistrationApproval(formData);
  if ("error" in normalized) redirectWith(false, normalized.error);
  const approval = normalized.data;

  const { data: reg, error: fetchError } = await supabase
    .from("employee_registrations")
    .select("*")
    .eq("id", id)
    .eq("status", "MENUNGGU")
    .maybeSingle();
  if (fetchError) redirectWith(false, fetchError.message);
  if (!reg) redirectWith(false, "Pendaftaran tidak ditemukan atau sudah diproses.");

  const { data: selectedUnit, error: unitError } = await supabase
    .from("units")
    .select("id")
    .eq("id", approval.home_unit_id)
    .eq("is_active", true)
    .maybeSingle();
  if (unitError) redirectWith(false, unitError.message);
  if (!selectedUnit) redirectWith(false, "Unit penempatan tidak valid atau sudah tidak aktif.");

  // Generate NIY (mengikuti generator intake): urut berikutnya dari NIY existing.
  const { data: niyRows } = await supabase.from("profiles").select("employee_no");
  const existing = (niyRows ?? []).map((r) => r.employee_no).filter(Boolean) as string[];
  const niyResult = buildNiy({
    birthDateISO: approval.birth_date,
    joinDateISO: approval.join_date,
    gender: approval.gender,
    sequence: nextSequence(existing),
  });
  if (!niyResult.niy) {
    redirectWith(false, `NIY gagal dibuat. Lengkapi: ${niyResult.missing.join(", ")}.`);
  }
  const employeeNo = niyResult.niy;

  // Guard against duplicate email/NIK/NIY.
  const { data: dupEmail } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${reg.email},employee_no.eq.${employeeNo},nik.eq.${approval.nik}`)
    .maybeSingle();
  if (dupEmail) redirectWith(false, "Email, NIK, atau NIY sudah terdaftar sebagai pegawai.");

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: reg.email,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: approval.full_name,
      employee_no: employeeNo,
      gender: approval.gender,
    },
  });
  if (authError || !authData.user?.id) {
    redirectWith(false, authError?.message ?? "Gagal membuat akun login pegawai.");
  }
  const userId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: approval.full_name,
    employee_no: employeeNo,
    email: reg.email,
    nik: approval.nik,
    phone: approval.phone,
    gender: approval.gender,
    marital_status: approval.marital_status,
    birth_place: approval.birth_place,
    birth_date: approval.birth_date,
    last_education: approval.last_education,
    study_program: approval.study_program,
    address_ktp: approval.address_ktp,
    address_domicile: approval.address_domicile,
    facebook: approval.facebook,
    instagram: approval.instagram,
    twitter: approval.twitter,
    home_unit_id: approval.home_unit_id,
    employee_status: approval.employee_status,
    active_status: "AKTIF",
    avatar_url: reg.photo_url,
    must_change_password: true,
  });
  if (profileError) redirectWith(false, profileError.message);

  await supabase.from("user_roles").insert({ user_id: userId, role: "PEGAWAI" });

  if (approval.home_unit_id) {
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    if (activeYear?.id) {
      await supabase.from("user_unit_assignments").upsert(
          {
            user_id: userId,
            unit_id: approval.home_unit_id,
          assignment_type: "HOME",
          academic_year_id: activeYear.id,
        },
        { onConflict: "user_id,unit_id,assignment_type,academic_year_id" }
      );
    }
  }

  if (approval.position_name) {
    await supabase.from("position_histories").insert({
      user_id: userId,
      unit_id: approval.home_unit_id,
      position_name: approval.position_name,
      start_date: approval.join_date,
      is_current: true,
    });
  }

  await supabase.from("employee_intake").upsert(
    {
      user_id: userId,
      emergency_name: approval.emergency_name,
      emergency_relation: approval.emergency_relation,
      emergency_phone: approval.emergency_phone,
      uniform_size: approval.uniform_size,
      ktp_url: reg.ktp_url,
      photo_url: reg.photo_url,
      created_by: reviewerId,
    },
    { onConflict: "user_id" }
  );

  // Pindahkan folder dokumen dari TEMP ke folder dokumen pegawai: [3 digit NIY]-NAMA.
  if (reg.drive_folder_id) {
    const last3 = employeeNo.replace(/\D/g, "").slice(-3);
    const folderName = `${last3}-${approval.full_name.toUpperCase()}`;
    try {
      await moveAndRenameFolder(reg.drive_folder_id, employeeDocumentRootFolderId(), folderName);
    } catch (e) {
      redirectWith(
        false,
        `Pegawai ${approval.full_name} dibuat (NIY ${employeeNo}), tetapi folder dokumen gagal dipindahkan: ${
          e instanceof Error ? e.message : "kesalahan Drive"
        }. Pindahkan manual bila perlu.`
      );
    }
  }

  const registrationUpdates = {
    full_name: approval.full_name,
    nik: approval.nik,
    phone: approval.phone,
    gender: approval.gender,
    marital_status: approval.marital_status,
    birth_place: approval.birth_place,
    birth_date: approval.birth_date,
    last_education: approval.last_education,
    study_program: approval.study_program,
    address_ktp: approval.address_ktp,
    address_domicile: approval.address_domicile,
    facebook: approval.facebook,
    instagram: approval.instagram,
    twitter: approval.twitter,
    home_unit_id: approval.home_unit_id,
    employee_status: approval.employee_status,
    position_name: approval.position_name,
    uniform_size: approval.uniform_size,
    emergency_name: approval.emergency_name,
    emergency_relation: approval.emergency_relation,
    emergency_phone: approval.emergency_phone,
    note: approval.note,
    status: "DISETUJUI" as const,
    employee_no: employeeNo,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  };

  await supabase
    .from("employee_registrations")
    .update(registrationUpdates)
    .eq("id", id);

  revalidatePath(BASE);
  revalidatePath("/dashboard/employees");
  redirectWith(true, `${approval.full_name} divalidasi. NIY ${employeeNo}, akun dibuat (password: bismillahns).`);
}

export async function rejectRegistrationAction(formData: FormData) {
  const { supabase } = await ensureHrdAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirectWith(false, "ID pendaftaran tidak valid.");

  // Not validated -> delete the record entirely.
  const { error } = await supabase.from("employee_registrations").delete().eq("id", id);
  if (error) redirectWith(false, error.message);

  revalidatePath(BASE);
  redirectWith(true, "Pendaftaran ditolak dan datanya dihapus.");
}

export async function generateInviteAction() {
  const { supabase } = await ensureHrdAdmin();
  const { error } = await supabase.rpc("generate_employee_invite");
  if (error) redirectWith(false, error.message);
  revalidatePath(BASE);
  redirectWith(true, "Kode undangan baru dibuat. Bagikan tautannya ke calon pegawai.");
}
