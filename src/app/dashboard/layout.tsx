import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar roles={context.roles} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader profile={context.profile} roles={context.roles} />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
