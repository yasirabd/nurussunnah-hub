"use client";

import Link from "next/link";
import type { ElementType } from "react";
import {
  ArrowRight,
  Building2,
  Clock,
  MessageSquareMore,
  UserRound,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  TETAP: "Pegawai Tetap",
  TIDAK_TETAP: "Tidak Tetap",
  KONTRAK: "Kontrak",
  HONORER: "Honorer",
  PENSIUN: "Pensiun",
};

interface DashboardContentProps {
  profile: {
    id: string;
    full_name: string | null;
    employee_status: string;
    is_active: boolean;
    units?: { id: string; name: string; code: string } | null;
  } | null;
  roles: string[];
  activeYear: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  feedbackDoneCount: number;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function DashboardContent({
  profile,
  roles,
  activeYear,
  feedbackDoneCount,
}: DashboardContentProps) {
  const isHrd = roles.includes("HRD");
  const isAdmin = roles.includes("ADMIN");
  const isKepalaUnit = roles.includes("KEPALA_UNIT");
  const firstName = profile?.full_name?.split(" ")[0] ?? "Pengguna";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[var(--radius-lg)] border bg-card elevation-1">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="h-7 rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
              {activeYear ? `Tahun Pelajaran ${activeYear.name}` : "Tahun pelajaran belum aktif"}
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                {greeting()}, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {profile?.units
                  ? `Unit ${profile.units.name}`
                  : "Lengkapi profil agar unit kerja tampil di dashboard."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Role" value={roles.length ? roles[0] : "Pegawai"} />
            <Metric label="Feedback" value={feedbackDoneCount.toString()} />
            <Metric label="Status" value={profile?.is_active ? "Aktif" : "Non-aktif"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        <ActionCard
          icon={MessageSquareMore}
          label="Feedback Rekan Kerja"
          title={feedbackDoneCount > 0 ? `${feedbackDoneCount} selesai` : "Belum ada"}
          href="/dashboard/feedback"
          actionLabel="Isi feedback"
        >
          <p className="text-xs text-muted-foreground">
            {activeYear ? `Periode ${activeYear.name}` : "Menunggu periode aktif"}
          </p>
        </ActionCard>

        <ActionCard
          icon={UserRound}
          label="Profil Pegawai"
          title={
            profile?.employee_status
              ? EMPLOYEE_STATUS_LABELS[profile.employee_status]
              : "Belum lengkap"
          }
          href="/dashboard/profile"
          actionLabel="Lihat profil"
        >
          <Badge
            variant={profile?.is_active ? "default" : "secondary"}
            className={cn(profile?.is_active && "border-0 bg-primary/10 text-primary")}
          >
            {profile?.is_active ? "Aktif" : "Non-aktif"}
          </Badge>
        </ActionCard>
      </section>

      {(isHrd || isAdmin || isKepalaUnit) && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-normal">Menu Manajemen</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Akses cepat untuk pekerjaan administrasi dan monitoring.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(isHrd || isAdmin || isKepalaUnit) && (
              <ManagementLink
                href="/dashboard/employees"
                icon={Users}
                title="Direktori Pegawai"
                description="Kelola dan pantau data seluruh pegawai."
              />
            )}
            {(isHrd || isAdmin) && (
              <ManagementLink
                href="/dashboard/academic-years"
                icon={Clock}
                title="Tahun Pelajaran"
                description="Atur periode aktif untuk data dan feedback."
              />
            )}
            {isAdmin && (
              <ManagementLink
                href="/dashboard/units"
                icon={Building2}
                title="Unit & Organisasi"
                description="Kelola unit dan struktur yayasan."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-[var(--radius-md)] bg-secondary px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  );
}


function ActionCard({
  icon: Icon,
  label,
  title,
  href,
  actionLabel,
  children,
}: {
  icon: ElementType;
  label: string;
  title: string;
  href: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-h-48 rounded-[var(--radius-lg)] border-border/70 elevation-1 transition-shadow hover:elevation-2">
      <CardHeader className="pb-0">
        <CardDescription className="flex items-center gap-2 text-xs font-medium">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </CardDescription>
        <CardTitle className="text-lg font-semibold tracking-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <div>{children}</div>
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-between rounded-[var(--radius-full)]"
          )}
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ManagementLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-[var(--radius-md)] border bg-card p-4 elevation-1 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

