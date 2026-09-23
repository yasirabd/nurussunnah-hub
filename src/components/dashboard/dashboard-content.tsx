"use client";

import Link from "next/link";
import type { ElementType } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock,
  MessageSquareText,
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
import { ACTIVE_STATUS_LABELS, EMPLOYEE_STATUS_LABELS } from "@/lib/employee-status";
import { cn } from "@/lib/utils";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";


type OperationalMetric = {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "success";
};

type OperationalAttentionItem = {
  key: string;
  title: string;
  detail: string;
  percent: number | null;
};

type OperationalSummary = {
  role: "HRD" | "KEPALA_UNIT";
  title: string;
  description: string;
  metrics: OperationalMetric[];
  attentionTitle: string;
  attentionItems: OperationalAttentionItem[];
  ctas: { href: string; label: string }[];
};

interface DashboardContentProps {
  profile: {
    id: string;
    full_name: string | null;
    employee_status: EmployeeStatus;
    active_status: ActiveStatus;
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
  operationalSummary?: OperationalSummary | null;
}

export function DashboardContent({
  profile,
  roles,
  activeYear,
  feedbackDoneCount,
  operationalSummary,
}: DashboardContentProps) {
  const isHrd = roles.includes("HRD");
  const isAdmin = roles.includes("ADMIN");
  const isKepalaUnit = roles.includes("KEPALA_UNIT");
  const firstName = profile?.full_name?.split(" ")[0] ?? "Pengguna";

  return (
    <div className="mx-auto max-w-6xl space-y-8 lg:space-y-10">
      <section className="portal-welcome overflow-hidden border-b border-border pb-8">
        <div className="flex flex-col gap-8 pt-2 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-3">
            <Badge className="h-auto rounded-none border-0 bg-transparent p-0 text-xs font-medium tracking-wide text-primary">
              {activeYear ? `Tahun Pelajaran ${activeYear.name}` : "Tahun pelajaran belum aktif"}
            </Badge>
            <div>
              <h1 className="max-w-xl break-words text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Assalamu&apos;alaikum, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {profile?.units
                  ? `Unit ${profile.units.name}`
                  : "Lengkapi profil agar unit kerja tampil di dashboard."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 xl:min-w-72 xl:shrink-0 xl:border-t-0 xl:pt-0">
            <Metric label="Role" value={roles.length ? roles[0] : "Pegawai"} />
            <Metric label="Feedback" value={feedbackDoneCount.toString()} />
            <Metric label="Status" value={profile ? ACTIVE_STATUS_LABELS[profile.active_status] : "-"} />
          </div>
        </div>
      </section>

      {operationalSummary && (
        <OperationalSummarySection summary={operationalSummary} />
      )}

      <section className="grid gap-4 md:grid-cols-[1.3fr_1fr]">

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
          <Badge variant="secondary">
            {profile ? ACTIVE_STATUS_LABELS[profile.active_status] : "-"}
          </Badge>
        </ActionCard>
      </section>

      {(isHrd || isAdmin || isKepalaUnit) && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Menu Manajemen</h2>
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

function OperationalSummarySection({ summary }: { summary: OperationalSummary }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{summary.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {summary.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.ctas.map((cta) => (
            <Link
              key={cta.href}
              href={cta.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-md text-primary"
              )}
            >
              {cta.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {summary.metrics.map((metric) => (
          <OperationalMetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <AttentionList title={summary.attentionTitle} items={summary.attentionItems} />
    </section>
  );
}

function OperationalMetricCard({ metric }: { metric: OperationalMetric }) {
  const toneClass =
    metric.tone === "warning"
      ? "bg-warning/12 text-warning"
      : metric.tone === "success"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  const Icon =
    metric.key.includes("feedback") || metric.key === "written"
      ? MessageSquareText
      : metric.key.includes("unit")
        ? Building2
        : Users;

  return (
    <Card className="rounded-none border-0 py-2 shadow-none">
      <CardContent className="flex flex-col items-start gap-4 p-5">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            toneClass
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-muted-foreground">
            {metric.label}
          </span>
          <span className="mt-2 block text-4xl font-medium tracking-tight tabular-nums">
            {metric.value}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {metric.helper}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}

function AttentionList({
  title,
  items,
}: {
  title: string;
  items: OperationalAttentionItem[];
}) {
  return (
    <Card className="rounded-xl border-0 bg-secondary/60 shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-warning" />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {items.length === 0 ? (
          <p className="rounded-[var(--radius-md)] bg-secondary/60 px-4 py-3 text-sm text-muted-foreground md:col-span-3">
            Belum ada data monitoring feedback.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.key}
              className="border-t border-border py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                {item.percent !== null && (
                  <Badge
                    variant="secondary"
                    className="border-0 bg-warning/12 text-warning"
                  >
                    {item.percent}%
                  </Badge>
                )}
              </div>
              {item.percent !== null && (
                <progress
                  className="portal-progress mt-3 block"
                  aria-label={`Penyelesaian feedback ${item.title}`}
                  value={item.percent}
                  max={100}
                />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-border pl-3">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm font-semibold tabular-nums">{value}</p>
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
    <Card className="min-h-52 rounded-xl border-border/70 py-6 shadow-none">
      <CardHeader className="pb-0">
        <CardDescription className="flex items-center gap-2 text-xs font-medium">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </CardDescription>
        <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <div>{children}</div>
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-between rounded-md border-t border-border px-0 text-primary"
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
      className="group flex items-start gap-3 border-t border-border py-5 transition-colors hover:bg-primary/5"
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
