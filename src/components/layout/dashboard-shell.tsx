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
    <div className="flex h-dvh overflow-hidden bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">
        Lewati ke konten
      </a>
      <AppSidebar roles={roles} isOpen={sidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          profile={profile}
          roles={roles}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
