"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadFilesToNewFolder, tempRootFolderId } from "@/lib/google-drive";

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function nullable(fd: FormData, key: string) {
  return text(fd, key) || null;
}
function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "PENDAFTAR";
}
function normalizePhone(value: string) {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  return trimmed.startsWith("+")
    ? "+" + trimmed.slice(1).replace(/\D/g, "")
    : trimmed.replace(/\D/g, "");
}
function isValidPhone(value: string) {
  return /^(?:\+?62|0)\d{8,13}$/.test(value);
}

function back(invite: string, ok: boolean, message: string): never {
  const suffix = ok ? "submitted=1" : `error=${encodeURIComponent(message)}`;
  redirect(`/register?invite=${encodeURIComponent(invite)}&${suffix}`);
}

export async function submitRegistrationAction(formData: FormData) {
  const invite = text(formData, "invite_code");
  if (!invite) redirect("/auth/login");

  const fullName = text(formData, "full_name");
  const email = text(formData, "email");
  const nikRaw = text(formData, "nik").replace(/\D/g, "");
  const phoneRaw = text(formData, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
  const emergencyPhoneRaw = text(formData, "emergency_phone");
  const emergencyPhone = emergencyPhoneRaw ? normalizePhone(emergencyPhoneRaw) : "";

  if (!fullName) back(invite, false, "Nama lengkap wajib diisi.");
  if (!email) back(invite, false, "Email wajib diisi.");
  const requiredFields: [string, string][] = [
    ["nik", "NIK"],
    ["phone", "No. HP"],
    ["gender", "Jenis Kelamin"],
    ["marital_status", "Status Perkawinan"],
    ["birth_place", "Tempat Lahir"],
    ["birth_date", "Tanggal Lahir"],
    ["last_education", "Pendidikan Terakhir"],
    ["address_ktp", "Alamat KTP"],
    ["address_domicile", "Alamat Domisili"],
    ["home_unit_id", "Unit yang Dituju"],
    ["position_name", "Jabatan yang Dilamar"],
    ["uniform_size", "Ukuran Seragam"],
    ["emergency_name", "Nama Kontak Darurat"],
    ["emergency_relation", "Hubungan Kontak Darurat"],
    ["emergency_phone", "No. HP Kontak Darurat"],
  ];
  for (const [field, label] of requiredFields) {
    if (!text(formData, field)) back(invite, false, `${label} wajib diisi.`);
  }
  if (nikRaw && nikRaw.length !== 16) back(invite, false, "NIK harus 16 digit angka.");
  if (phone && !isValidPhone(phone))
    back(invite, false, "Nomor HP tidak valid. Gunakan format 08xxxx atau +62xxxx.");
  if (emergencyPhone && !isValidPhone(emergencyPhone))
    back(invite, false, "Nomor HP kontak darurat tidak valid.");

  // Upload dokumen ke folder TEMP Drive; dipindahkan & di-rename saat validasi.
  let ktpUrl: string | null = null;
  let photoUrl: string | null = null;
  let driveFolderId: string | null = null;

  const ktpFile = formData.get("ktp_file");
  const photoFile = formData.get("photo_file");
  const hasKtp = ktpFile instanceof File && ktpFile.size > 0;
  const hasPhoto = photoFile instanceof File && photoFile.size > 0;
  if (!hasKtp) back(invite, false, "Scan/Foto KTP wajib diunggah.");
  if (!hasPhoto) back(invite, false, "Pas foto wajib diunggah.");
  const files: { field: string; file: File }[] = [
    { field: "ktp", file: ktpFile as File },
    { field: "photo", file: photoFile as File },
  ];

  if (files.length) {
    try {
      const folderName = sanitize(fullName.toUpperCase());
      const { folderId, uploaded } = await uploadFilesToNewFolder(
        tempRootFolderId(),
        folderName,
        files
      );
      driveFolderId = folderId;
      ktpUrl = uploaded.find((u) => u.field === "ktp")?.driveViewLink ?? null;
      photoUrl = uploaded.find((u) => u.field === "photo")?.driveViewLink ?? null;
    } catch (e) {
      back(
        invite,
        false,
        e instanceof Error ? `Gagal mengunggah dokumen: ${e.message}` : "Gagal mengunggah dokumen."
      );
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_employee_registration", {
    p_invite_code: invite,
    p_full_name: fullName,
    p_email: email,
    p_nik: nikRaw || null,
    p_phone: phone || null,
    p_gender: text(formData, "gender") === "P" ? "P" : "L",
    p_marital_status: nullable(formData, "marital_status"),
    p_birth_place: nullable(formData, "birth_place"),
    p_birth_date: nullable(formData, "birth_date"),
    p_last_education: nullable(formData, "last_education"),
    p_study_program: nullable(formData, "study_program"),
    p_address_ktp: nullable(formData, "address_ktp"),
    p_address_domicile: nullable(formData, "address_domicile"),
    p_facebook: nullable(formData, "facebook"),
    p_instagram: nullable(formData, "instagram"),
    p_twitter: nullable(formData, "twitter"),
    p_home_unit_id: nullable(formData, "home_unit_id"),
    p_employee_status: text(formData, "employee_status") || "CPTY",
    p_position_name: nullable(formData, "position_name"),
    p_emergency_name: nullable(formData, "emergency_name"),
    p_emergency_relation: nullable(formData, "emergency_relation"),
    p_emergency_phone: emergencyPhone || null,
    p_uniform_size: nullable(formData, "uniform_size"),
    p_ktp_url: ktpUrl,
    p_photo_url: photoUrl,
    p_drive_folder_id: driveFolderId,
    p_note: nullable(formData, "note"),
  });

  if (error) back(invite, false, error.message);
  back(invite, true, "");
}
