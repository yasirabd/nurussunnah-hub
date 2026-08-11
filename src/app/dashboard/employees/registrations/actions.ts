"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveEmployeeNo } from "@/lib/employee-niy-server";
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

  const niyResult = await resolveEmployeeNo({
    supabase,
    mode: "auto",
    employeeStatus: approval.employee_status,
    effectiveDate: approval.join_date,
    birthDate: approval.birth_date,
    gender: approval.gender,
  });
  if ("error" in niyResult) redirectWith(false, niyResult.error);
  const employeeNo = niyResult.employeeNo;

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
    employee_status_effective_date: approval.join_date,
    active_status: "AKTIF",
    avatar_url: reg.photo_url,
    must_change_password: true,
  });
  if (profileError) redirectWith(false, profileError.message);

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: "PEGAWAI" });
  if (roleError) {
    redirectWith(false, `Akun pegawai dibuat, tetapi role PEGAWAI gagal disimpan: ${roleError.message}`);
  }

  if (approval.home_unit_id) {
    const { data: activeYear, error: activeYearError } = await supabase
      .from("academic_years")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    if (activeYearError) redirectWith(false, activeYearError.message);
    if (!activeYear?.id) {
      redirectWith(false, "Akun pegawai dibuat, tetapi tahun ajaran aktif tidak ditemukan.");
    }
    const { error: assignmentError } = await supabase.from("user_unit_assignments").upsert(
      {
        user_id: userId,
        unit_id: approval.home_unit_id,
        assignment_type: "HOME",
        academic_year_id: activeYear.id,
      },
      { onConflict: "user_id,unit_id,assignment_type,academic_year_id" }
    );
    if (assignmentError) {
      redirectWith(false, `Akun pegawai dibuat, tetapi penempatan unit gagal disimpan: ${assignmentError.message}`);
    }
  }

  if (approval.position_name) {
    const { error: positionError } = await supabase.from("position_histories").insert({
      user_id: userId,
      unit_id: approval.home_unit_id,
      position_name: approval.position_name,
      start_date: approval.join_date,
      is_current: true,
    });
    if (positionError) {
      redirectWith(false, `Akun pegawai dibuat, tetapi riwayat jabatan gagal disimpan: ${positionError.message}`);
    }
  }

  const { error: intakeError } = await supabase.from("employee_intake").upsert(
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
  if (intakeError) {
    redirectWith(false, `Akun pegawai dibuat, tetapi data intake gagal disimpan: ${intakeError.message}`);
  }

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

  const { data: updatedRegistration, error: registrationError } = await supabase
    .from("employee_registrations")
    .update(registrationUpdates)
    .eq("id", id)
    .eq("status", "MENUNGGU")
    .select("id")
    .maybeSingle();
  if (registrationError) {
    redirectWith(false, `Pegawai dibuat, tetapi audit pendaftaran gagal diperbarui: ${registrationError.message}`);
  }
  if (!updatedRegistration) {
    redirectWith(false, "Pegawai dibuat, tetapi pendaftaran sudah diproses oleh pengguna lain.");
  }

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
