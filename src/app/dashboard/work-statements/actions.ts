"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json, ReviewAction } from "@/types/database";

type ActionResult = {
  ok: boolean;
  message: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getContent(formData: FormData): Json {
  return {
    position: text(formData, "position"),
    main_tasks: text(formData, "main_tasks"),
    teaching_units: text(formData, "teaching_units"),
    weekly_load: text(formData, "weekly_load"),
    commitment: text(formData, "commitment"),
    notes: text(formData, "notes"),
  };
}

function redirectWith(result: ActionResult): never {
  const type = result.ok ? "success" : "error";
  redirect(`/dashboard/work-statements?${type}=${encodeURIComponent(result.message)}`);
}

export async function saveDraftAction(formData: FormData) {
  const supabase = await createClient();
  const academicYearId = text(formData, "academic_year_id");

  const { error } = await supabase.rpc("save_work_statement_draft", {
    p_academic_year_id: academicYearId,
    p_content: getContent(formData),
    p_signature_data: text(formData, "signature_data") || null,
  });

  revalidatePath("/dashboard/work-statements");
  redirectWith(
    error
      ? { ok: false, message: error.message }
      : { ok: true, message: "Draft surat berhasil disimpan." }
  );
}

export async function submitWorkStatementAction(formData: FormData) {
  const supabase = await createClient();
  const academicYearId = text(formData, "academic_year_id");

  const { error } = await supabase.rpc("submit_work_statement", {
    p_academic_year_id: academicYearId,
    p_content: getContent(formData),
    p_signature_data: text(formData, "signature_data"),
  });

  revalidatePath("/dashboard/work-statements");
  redirectWith(
    error
      ? { ok: false, message: error.message }
      : { ok: true, message: "Surat berhasil dikirim untuk review." }
  );
}

export async function reviewWorkStatementAction(formData: FormData) {
  const supabase = await createClient();
  const action = text(formData, "action") as ReviewAction;

  const { error } = await supabase.rpc("review_work_statement", {
    p_work_statement_id: text(formData, "work_statement_id"),
    p_action: action,
    p_notes: text(formData, "notes") || undefined,
  });

  revalidatePath("/dashboard/work-statements");
  redirectWith(
    error
      ? { ok: false, message: error.message }
      : { ok: true, message: "Review surat berhasil disimpan." }
  );
}
export async function uploadWorkStatementPdfAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const file = formData.get('pdf');
  const workStatementId = text(formData, 'work_statement_id');
  if (!(file instanceof File) || file.type !== 'application/pdf') {
    redirectWith({ ok: false, message: 'File PDF wajib diunggah.' });
  }

  const { data: statement, error: statementError } = await supabase
    .from('work_statements')
    .select('id, user_id, status')
    .eq('id', workStatementId)
    .eq('user_id', user.id)
    .single();

  if (statementError || !statement || statement.status !== 'APPROVED') {
    redirectWith({ ok: false, message: 'Hanya surat approved milik sendiri yang dapat menyimpan PDF.' });
  }

  const path = `${user.id}/${workStatementId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('work-statement-pdfs')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });

  if (uploadError) redirectWith({ ok: false, message: uploadError.message });

  const { data } = supabase.storage.from('work-statement-pdfs').getPublicUrl(path);
  const { error } = await supabase
    .from('work_statements')
    .update({ pdf_url: data.publicUrl })
    .eq('id', workStatementId);

  revalidatePath('/dashboard/work-statements');
  redirectWith(
    error
      ? { ok: false, message: error.message }
      : { ok: true, message: 'PDF surat berhasil disimpan.' }
  );
}
