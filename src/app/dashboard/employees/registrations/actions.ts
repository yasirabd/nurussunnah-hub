"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildNiy, nextSequence } from "@/lib/niy.mjs";
import { isEmployeeStatus } from "@/lib/employee-status";
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
  const joinDate = String(formData.get("join_date") ?? "").trim();
  const employeeStatus = String(formData.get("employee_status") ?? "").trim();
  if (!id) redirectWith(false, "ID pendaftaran tidak valid.");
  if (!joinDate) redirectWith(false, "Tanggal masuk wajib diisi sebagai dasar NIY.");
  if (!isEmployeeStatus(employeeStatus)) redirectWith(false, "Status pegawai wajib dipilih.");

  const { data: reg, error: fetchError } = await supabase
    .from("employee_registrations")
    .select("*")
    .eq("id", id)
    .eq("status", "MENUNGGU")
    .maybeSingle();
  if (fetchError) redirectWith(false, fetchError.message);
  if (!reg) redirectWith(false, "Pendaftaran tidak ditemukan atau sudah diproses.");

  if (!reg.birth_date) redirectWith(false, "Tanggal lahir pendaftar kosong; tidak bisa membuat NIY.");

  // Generate NIY (mengikuti generator intake): urut berikutnya dari NIY existing.
  const { data: niyRows } = await supabase.from("profiles").select("employee_no");
  const existing = (niyRows ?? []).map((r) => r.employee_no).filter(Boolean) as string[];
  const niyResult = buildNiy({
    birthDateISO: reg.birth_date,
    joinDateISO: joinDate,
    gender: reg.gender,
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
    .or(`email.eq.${reg.email},employee_no.eq.${employeeNo}`)
    .maybeSingle();
  if (dupEmail) redirectWith(false, "Email atau NIY sudah terdaftar sebagai pegawai.");

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: reg.email,
    password: DEFAULT_EMPLOYEE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: reg.full_name,
      employee_no: employeeNo,
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
    employee_no: employeeNo,
    email: reg.email,
    nik: reg.nik,
    phone: reg.phone,
    gender: reg.gender,
    marital_status: reg.marital_status,
    birth_place: reg.birth_place,
    birth_date: reg.birth_date,
    last_education: reg.last_education,
    study_program: reg.study_program,
    address_ktp: reg.address_ktp,
    address_domicile: reg.address_domicile,
    facebook: reg.facebook,
    instagram: reg.instagram,
    twitter: reg.twitter,
    home_unit_id: reg.home_unit_id,
    employee_status: employeeStatus,
    active_status: "AKTIF",
    avatar_url: reg.photo_url,
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

  if (reg.position_name) {
    await supabase.from("position_histories").insert({
      user_id: userId,
      unit_id: reg.home_unit_id,
      position_name: reg.position_name,
      start_date: joinDate,
      is_current: true,
    });
  }

  const uniform = (reg.uniform_size ?? "").toUpperCase();
  const validUniform = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(uniform);
  await supabase.from("employee_intake").upsert(
    {
      user_id: userId,
      emergency_name: reg.emergency_name,
      emergency_relation: reg.emergency_relation,
      emergency_phone: reg.emergency_phone,
      uniform_size: validUniform ? (uniform as "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL") : null,
      ktp_url: reg.ktp_url,
      photo_url: reg.photo_url,
      created_by: reviewerId,
    },
    { onConflict: "user_id" }
  );

  // Pindahkan folder dokumen dari TEMP ke folder dokumen pegawai: [3 digit NIY]-NAMA.
  if (reg.drive_folder_id) {
    const last3 = employeeNo.replace(/\D/g, "").slice(-3);
    const folderName = `${last3}-${reg.full_name.toUpperCase()}`;
    try {
      await moveAndRenameFolder(reg.drive_folder_id, employeeDocumentRootFolderId(), folderName);
    } catch (e) {
      redirectWith(
        false,
        `Pegawai ${reg.full_name} dibuat (NIY ${employeeNo}), tetapi folder dokumen gagal dipindahkan: ${
          e instanceof Error ? e.message : "kesalahan Drive"
        }. Pindahkan manual bila perlu.`
      );
    }
  }

  await supabase
    .from("employee_registrations")
    .update({
      status: "DISETUJUI",
      employee_no: employeeNo,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(BASE);
  revalidatePath("/dashboard/employees");
  redirectWith(true, `${reg.full_name} divalidasi. NIY ${employeeNo}, akun dibuat (password: bismillahns).`);
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
