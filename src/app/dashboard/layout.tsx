import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { headers } from "next/headers";
import { getDashboardUserContext } from "@/lib/auth/user-context";
import { canAccessDashboard } from "@/lib/employee-leave.mjs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardUserContext();
  if (!context) redirect("/auth/login");

  if (context.profile && !canAccessDashboard(context.profile.active_status)) redirect("/auth/logout");

  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";
  if (context.profile?.must_change_password && pathname !== "/dashboard/change-password") {
    redirect("/dashboard/change-password");
  }
  if (!context.profile?.must_change_password && pathname === "/dashboard/change-password") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell profile={context.profile} roles={context.roles}>
      {children}
    </DashboardShell>
  );
}
