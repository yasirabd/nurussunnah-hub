"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getVisibleNavItems } from "./app-sidebar";

const ROLE_LABELS: Record<string, string> = {
  PEGAWAI: "Pegawai",
  KEPALA_UNIT: "Kepala Unit",
  HRD: "HRD",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  HRD: "bg-primary/10 text-primary",
  ADMIN: "bg-warning/12 text-warning",
  KEPALA_UNIT: "bg-accent text-accent-foreground",
  PEGAWAI: "bg-success/12 text-success",
};

interface AppHeaderProps {
  profile: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  roles: string[];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function AppHeader({ profile, roles }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleItems = getVisibleNavItems(roles);

  function handleLogout() {
    window.location.assign("/auth/logout");
  }

  const primaryRole = ["HRD", "ADMIN", "KEPALA_UNIT", "PEGAWAI"].find((role) =>
    roles.includes(role)
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-card/95 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-3 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Buka navigasi"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] border-0 bg-transparent text-foreground transition-colors hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Menu
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <DropdownMenuItem
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "gap-3 rounded-[var(--radius-sm)]",
                    isActive && "bg-primary/8 font-semibold text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-xs font-bold text-primary-foreground">
            N
          </div>
          <span className="text-sm font-semibold">Nurussunnah Hub</span>
        </div>
      </div>

      {/* Desktop: page context */}
      <div className="hidden md:block">
        <p className="text-sm font-semibold tracking-normal">Dashboard SDM</p>
        <p className="text-xs text-muted-foreground">Yayasan Islam Nurus Sunnah</p>
      </div>

      {/* Right: role badge + user menu */}
      <div className="flex items-center gap-2">
        {primaryRole && (
          <Badge
            variant="secondary"
            className={cn(
              "hidden rounded-[var(--radius-full)] border-0 px-3 text-xs font-medium sm:inline-flex",
              ROLE_COLORS[primaryRole]
            )}
          >
            {ROLE_LABELS[primaryRole]}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            id="user-menu-trigger"
            className="flex items-center gap-2 rounded-[var(--radius-full)] px-2 py-1.5 outline-none transition-colors hover:bg-muted"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="rounded-[var(--radius-full)] bg-primary/12 text-xs font-semibold text-primary">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
              {profile?.full_name ?? "Pengguna"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate font-semibold">{profile?.full_name ?? "Pengguna"}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {roles.map((role) => ROLE_LABELS[role] ?? role).join(" · ")}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="profile-link"
              onClick={() => router.push("/dashboard/profile")}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              Profil Saya
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="logout-button"
              onClick={handleLogout}
              variant="destructive"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
