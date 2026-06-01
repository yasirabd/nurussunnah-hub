import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard - Nurussunnah Hub" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, employee_status, is_active, home_unit_id, units!profiles_home_unit_id_fkey(id, name, code)")
    .eq("id", user.id)
    .single();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date")
    .eq("is_active", true)
    .single();

  const roles: string[] = (userRoles ?? []).map((role) => role.role);

  const { count: feedbackDone } = activeYear
    ? await supabase
        .from("peer_feedbacks")
        .select("id", { count: "exact", head: true })
        .eq("giver_user_id", user.id)
        .eq("academic_year_id", activeYear.id)
        .eq("is_completed", true)
    : { count: 0 };


  return (
    <DashboardContent
      profile={profile}
      roles={roles}
      activeYear={activeYear}
      feedbackDoneCount={feedbackDone ?? 0}
    />
  );
}

