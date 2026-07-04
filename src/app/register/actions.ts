"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function nullable(fd: FormData, key: string) {
  return text(fd, key) || null;
}

function back(invite: string, ok: boolean, message: string): never {
  const suffix = ok ? "submitted=1" : `error=${encodeURIComponent(message)}`;
  redirect(`/register?invite=${encodeURIComponent(invite)}&${suffix}`);
}

export async function submitRegistrationAction(formData: FormData) {
  const invite = text(formData, "invite_code");
  // Trust boundary: the invite code is validated + consumed inside the RPC.
  if (!invite) redirect("/auth/login");

  const fullName = text(formData, "full_name");
  const employeeNo = text(formData, "employee_no");
  const email = text(formData, "email");
  if (!fullName) back(invite, false, "Nama lengkap wajib diisi.");
  if (!employeeNo) back(invite, false, "NIY wajib diisi.");
  if (!email) back(invite, false, "Email wajib diisi.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_employee_registration", {
    p_invite_code: invite,
    p_full_name: fullName,
    p_employee_no: employeeNo,
    p_email: email,
    p_phone: nullable(formData, "phone"),
    p_gender: text(formData, "gender") === "P" ? "P" : "L",
    p_marital_status: nullable(formData, "marital_status"),
    p_birth_place: nullable(formData, "birth_place"),
    p_birth_date: nullable(formData, "birth_date"),
    p_last_education: nullable(formData, "last_education"),
    p_study_program: nullable(formData, "study_program"),
    p_address_ktp: nullable(formData, "address_ktp"),
    p_address_domicile: nullable(formData, "address_domicile"),
    p_home_unit_id: nullable(formData, "home_unit_id"),
    p_employee_status: text(formData, "employee_status") || "CPTY",
    p_note: nullable(formData, "note"),
  });

  if (error) back(invite, false, error.message);
  back(invite, true, "");
}
