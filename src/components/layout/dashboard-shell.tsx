"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";

interface DashboardShellProps {
  profile: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  roles: string[];
  children: React.ReactNode;
}

export function DashboardShell({ profile, roles, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar roles={roles} isOpen={sidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          profile={profile}
          roles={roles}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
