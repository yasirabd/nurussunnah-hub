import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, employee_status, home_unit_id, units!profiles_home_unit_id_fkey(name)")
    .eq("id", user.id)
    .single();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles: string[] = (userRoles ?? []).map((r) => r.role);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar roles={roles} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader profile={profile} roles={roles} />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
