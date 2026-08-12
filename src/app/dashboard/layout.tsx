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
  if (!context.profile) redirect("/auth/logout");

  if (!canAccessDashboard(context.profile.active_status)) redirect("/auth/logout");

  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";
  if (context.profile.must_change_password) {
    if (pathname !== "/dashboard/change-password") redirect("/dashboard/change-password");

    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    );
  }
  if (pathname === "/dashboard/change-password") redirect("/dashboard");

  return (
    <DashboardShell profile={context.profile} roles={context.roles}>
      {children}
    </DashboardShell>
  );
}
