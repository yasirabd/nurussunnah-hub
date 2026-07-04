"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardClock,
  FileText,
  LayoutDashboard,
  MessageSquareMore,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRoleEnum } from "@/types/database";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRoleEnum[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profil Saya", href: "/dashboard/profile", icon: Users },
  { label: "Feedback Rekan", href: "/dashboard/feedback", icon: MessageSquareMore },
  { label: "Izin Pegawai", href: "/dashboard/leave-requests", icon: CalendarClock },
  { label: "Koreksi Presensi", href: "/dashboard/attendance-corrections", icon: ClipboardClock },
  {
    label: "Direktori Pegawai",
    href: "/dashboard/employees",
    icon: Users,
    roles: ["HRD", "ADMIN", "KEPALA_UNIT"],
  },

  {
    label: "Dokumen Kepegawaian",
    href: "/dashboard/employment-documents",
    icon: FileText,
    roles: ["HRD", "ADMIN"],
  },
  {
    label: "Tahun Pelajaran",
    href: "/dashboard/academic-years",
    icon: CalendarDays,
    roles: ["HRD", "ADMIN"],
  },
  {
    label: "Unit & Organisasi",
    href: "/dashboard/units",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    label: "Pengaturan",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

interface AppSidebarProps {
  roles: string[];
  isOpen?: boolean;
}

export function getVisibleNavItems(roles: string[]) {
  return navItems.filter(
    (item) => !item.roles || item.roles.some((role) => roles.includes(role))
  );
}

export function AppSidebar({ roles, isOpen = true }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(roles);

  return (
    <aside className={cn("hidden h-full flex-col bg-sidebar text-sidebar-foreground md:flex overflow-hidden transition-[width] duration-300 ease-in-out", isOpen ? "w-72 shrink-0" : "w-0")}>
      {/* Brand â€” MD3 NavigationDrawer header */}
      <div className="flex h-[72px] shrink-0 items-center gap-3 px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-sidebar-primary shadow-sm">
          <span className="text-base font-bold text-sidebar-primary-foreground">N</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
            Nurussunnah Hub
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/55">
            Yayasan Islam Nurus Sunnah
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Nav section label */}
      <p className="mt-5 mb-1 px-6 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        Menu
      </p>

      {/* Nav items â€” MD3 NavigationDrawer list */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[var(--radius-full)] px-4 py-3 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-border/40 hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80"
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <p className="text-center text-[10px] text-sidebar-foreground/38">
          &copy; {new Date().getFullYear()} Nurussunnah Hub v1.0
        </p>
      </div>
    </aside>
  );
}



