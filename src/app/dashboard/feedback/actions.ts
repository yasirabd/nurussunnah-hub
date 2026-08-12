"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFeatureAccess } from "@/lib/auth/feature-access";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWith(ok: boolean, message: string): never {
  const key = ok ? "success" : "error";
  redirect(`/dashboard/feedback?${key}=${encodeURIComponent(message)}`);
}

export async function submitFeedbackAction(formData: FormData) {
  await requireFeatureAccess();
  const supabase = await createClient();
  const rating = Number.parseInt(text(formData, "rating"), 10);

  const { error } = await supabase.rpc("submit_peer_feedback", {
    p_academic_year_id: text(formData, "academic_year_id"),
    p_receiver_user_id: text(formData, "receiver_user_id"),
    p_rating: rating,
    p_feedback_text: text(formData, "feedback_text"),
  });

  revalidatePath("/dashboard/feedback");
  redirectWith(
    !error,
    error ? error.message : "Feedback rekan kerja berhasil disimpan."
  );
}
