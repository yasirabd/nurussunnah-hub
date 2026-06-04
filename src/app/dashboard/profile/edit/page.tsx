import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit Profil" };

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/dashboard/profile?error=Data%20profil%20belum%20tersedia.");
  }

  return <ProfileEditForm profile={profile} />;
}
