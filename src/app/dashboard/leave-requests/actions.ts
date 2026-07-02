"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  uploadToDrive,
  leaveRootFolderId,
  monthSegment,
} from "@/lib/google-drive";

const PATH = "/dashboard/leave-requests";

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function redirectWith(ok: boolean, message: string, tab?: string): never {
  const key = ok ? "success" : "error";
  const t = tab ? `&tab=${tab}` : "";
  redirect(`${PATH}?${key}=${encodeURIComponent(message)}${t}`);
}

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

export async function submitLeaveRequestAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirectWith(false, "Sesi berakhir, silakan login ulang.");

  const unitHeadApproved = text(formData, "unit_head_approved") === "SUDAH";
  if (!unitHeadApproved) {
    redirectWith(
      false,
      "Silakan minta izin kepala unit terlebih dahulu sebelum mengajukan form ini.",
      "ajukan"
    );
  }

  const startDate = text(formData, "start_date");
  const endDate = text(formData, "end_date") || startDate;

  const { data: newId, error } = await supabase.rpc("submit_leave_request", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_leave_category: text(formData, "leave_category"),
    p_leave_time_type: text(formData, "leave_time_type") as Database["public"]["Enums"]["leave_time_type_enum"],
    p_reason: text(formData, "reason"),
    p_unit_head_approved: unitHeadApproved,
    p_no_evidence_ack: text(formData, "no_evidence_ack") === "on",
  });

  if (error || !newId) {
    redirectWith(false, error?.message ?? "Gagal menyimpan pengajuan.", "ajukan");
  }

  const leaveId = newId as unknown as string;

  // Nama pegawai untuk struktur folder Drive
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();
  const folderName = `${sanitize(profile?.full_name ?? "pegawai")}_${startDate}`;
  const segments = [monthSegment(new Date(startDate)), folderName];

  const evidence = formData.getAll("bukti_izin").filter((f): f is File => f instanceof File && f.size > 0);
  const unitHeadSs = formData.getAll("bukti_ss_kepala_unit").filter((f): f is File => f instanceof File && f.size > 0);

  const rows: {
    leave_request_id: string;
    kind: "BUKTI_IZIN" | "SS_KEPALA_UNIT";
    drive_file_id: string;
    drive_view_link: string;
    file_name: string;
    mime_type: string;
  }[] = [];

  try {
    let root: string | null = null;
    if (evidence.length || unitHeadSs.length) root = leaveRootFolderId();

    for (const file of evidence) {
      const r = await uploadToDrive(root!, segments, file);
      rows.push({
        leave_request_id: leaveId,
        kind: "BUKTI_IZIN",
        drive_file_id: r.driveFileId,
        drive_view_link: r.driveViewLink,
        file_name: r.fileName,
        mime_type: r.mimeType,
      });
    }
    for (const file of unitHeadSs) {
      const r = await uploadToDrive(root!, segments, file);
      rows.push({
        leave_request_id: leaveId,
        kind: "SS_KEPALA_UNIT",
        drive_file_id: r.driveFileId,
        drive_view_link: r.driveViewLink,
        file_name: r.fileName,
        mime_type: r.mimeType,
      });
    }

    if (rows.length) {
      await supabase.from("leave_request_attachments").insert(rows);
    }
  } catch (e) {
    revalidatePath(PATH);
    redirectWith(
      false,
      `Pengajuan tersimpan, tetapi upload bukti ke Drive gagal: ${
        e instanceof Error ? e.message : "unknown"
      }. Silakan hubungi admin.`,
      "riwayat"
    );
  }

  revalidatePath(PATH);
  redirectWith(true, "Pengajuan izin berhasil dikirim.", "riwayat");
}

export async function reviewLeaveRequestAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_leave_request", {
    p_id: text(formData, "id"),
    p_status: text(formData, "status") as Database["public"]["Enums"]["leave_request_status_enum"],
    p_note: text(formData, "admin_note"),
  });
  revalidatePath(PATH);
  redirectWith(!error, error ? error.message : "Status pengajuan diperbarui.", "validasi");
}

