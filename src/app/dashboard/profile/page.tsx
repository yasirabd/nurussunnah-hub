import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile/profile-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profil Saya - Nurussunnah Hub" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, units!profiles_home_unit_id_fkey(id, name, code)")
    .eq("id", user.id)
    .single();

  const { data: positionHistories } = await supabase
    .from("position_histories")
    .select("*, units(name)")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  const { data: unitAssignments } = await supabase
    .from("user_unit_assignments")
    .select("*, units(name, code), academic_years(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles: string[] = (userRoles ?? []).map((role) => role.role);
  const success = params.success;
  const error = params.error;

  return (
    <ProfileView
      profile={profile}
      positionHistories={positionHistories ?? []}
      unitAssignments={unitAssignments ?? []}
      roles={roles}
      successMessage={Array.isArray(success) ? success[0] : success}
      errorMessage={Array.isArray(error) ? error[0] : error}
      userEmail={user.email ?? ""}
    />
  );
}
