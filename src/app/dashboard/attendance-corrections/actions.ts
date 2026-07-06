"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { deriveAttendanceTimeScope } from "@/lib/attendance-correction.mjs";
import type { Database } from "@/types/database";
import {
  uploadToDrive,
  correctionRootFolderId,
  monthSegment,
} from "@/lib/google-drive";

const PATH = "/dashboard/attendance-corrections";

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

export async function submitCorrectionAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirectWith(false, "Sesi berakhir, silakan login ulang.");

  const eventDate = text(formData, "event_date");
  const timeScope = deriveAttendanceTimeScope(formData.getAll("time_parts"));
  const requestedCheckIn = text(formData, "requested_check_in") || null;
  const requestedCheckOut = text(formData, "requested_check_out") || null;

  if (!timeScope) redirectWith(false, "Pilih presensi yang perlu dikoreksi.", "ajukan");

  const { data: newId, error } = await supabase.rpc("submit_attendance_correction", {
    p_event_date: eventDate,
    p_correction_kind: text(formData, "correction_kind") as Database["public"]["Enums"]["attendance_correction_kind_enum"],
    p_time_scope: timeScope,
    p_reason: text(formData, "reason"),
    p_requested_check_in: requestedCheckIn,
    p_requested_check_out: requestedCheckOut,
  });

  if (error || !newId) {
    redirectWith(false, error?.message ?? "Gagal menyimpan pengajuan.", "ajukan");
  }

  const correctionId = newId as unknown as string;
  const files = formData
    .getAll("bukti")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      const folder = `${sanitize(profile?.full_name ?? "pegawai")}_${eventDate}`;
      const segments = [monthSegment(new Date(eventDate)), folder];
      const root = correctionRootFolderId();

      const rows = [];
      for (const file of files) {
        const r = await uploadToDrive(root, segments, file);
        rows.push({
          attendance_correction_id: correctionId,
          drive_file_id: r.driveFileId,
          drive_view_link: r.driveViewLink,
          file_name: r.fileName,
          mime_type: r.mimeType,
        });
      }
      await supabase.from("attendance_correction_attachments").insert(rows);
    } catch (e) {
      revalidatePath(PATH);
      redirectWith(
        false,
        `Pengajuan tersimpan, tetapi upload bukti ke Drive gagal: ${
          e instanceof Error ? e.message : "unknown"
        }.`,
        "riwayat"
      );
    }
  }

  revalidatePath(PATH);
  redirectWith(true, "Pengajuan koreksi presensi berhasil dikirim.", "riwayat");
}

export async function reviewCorrectionAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_attendance_correction", {
    p_id: text(formData, "id"),
    p_status: text(formData, "status") as Database["public"]["Enums"]["attendance_correction_status_enum"],
    p_note: text(formData, "admin_note"),
  });
  revalidatePath(PATH);
  redirectWith(!error, error ? error.message : "Status pengajuan diperbarui.", "validasi");
}

