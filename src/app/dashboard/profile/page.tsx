import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { getDashboardUserContext } from "@/lib/auth/user-context";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profil Saya" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const context = await getDashboardUserContext();
  if (!context) redirect("/auth/login");

  const [{ data: profile }, { data: positionHistories }, { data: unitAssignments }, { data: activeLeave }] =
    await Promise.all([
      context.supabase
        .from("profiles")
        .select("*, units!profiles_home_unit_id_fkey(id, name, code)")
        .eq("id", context.user.id)
        .single(),
      context.supabase
        .from("position_histories")
        .select("*, units(name)")
        .eq("user_id", context.user.id)
        .order("start_date", { ascending: false }),
      context.supabase
        .from("user_unit_assignments")
        .select("*, units(name, code), academic_years(name)")
        .eq("user_id", context.user.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("employee_leaves")
        .select("start_date, end_date, reason")
        .eq("user_id", context.user.id)
        .eq("status", "ACTIVE")
        .maybeSingle(),
    ]);

  const roles = context.roles;
  const success = params.success;
  const error = params.error;

  return (
    <ProfileView
      profile={profile}
      positionHistories={positionHistories ?? []}
      unitAssignments={unitAssignments ?? []}
      activeLeave={activeLeave}
      roles={roles}
      successMessage={Array.isArray(success) ? success[0] : success}
      errorMessage={Array.isArray(error) ? error[0] : error}
      userEmail={context.user.email ?? ""}
    />
  );
}
