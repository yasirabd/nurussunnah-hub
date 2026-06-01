"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import type {
  AcademicYear,
  PositionHistory,
  Profile,
  Unit,
  UserUnitAssignment,
} from "@/types/database";

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  TETAP: "Pegawai Tetap",
  TIDAK_TETAP: "Tidak Tetap",
  KONTRAK: "Kontrak",
  HONORER: "Honorer",
  PENSIUN: "Pensiun",
};

const ROLE_LABELS: Record<string, string> = {
  PEGAWAI: "Pegawai",
  KEPALA_UNIT: "Kepala Unit",
  HRD: "HRD",
  ADMIN: "Admin Umum",
};

type ProfileWithUnit = Profile & {
  units?: Pick<Unit, "id" | "name" | "code"> | null;
};

type PositionHistoryWithUnit = PositionHistory & {
  units?: Pick<Unit, "name"> | null;
};

type UnitAssignmentWithRelations = UserUnitAssignment & {
  units?: Pick<Unit, "name" | "code"> | null;
  academic_years?: Pick<AcademicYear, "name"> | null;
};

interface ProfileViewProps {
  profile: ProfileWithUnit | null;
  positionHistories: PositionHistoryWithUnit[];
  unitAssignments: UnitAssignmentWithRelations[];
  roles: string[];
  userEmail: string;
  successMessage?: string;
  errorMessage?: string;
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function ProfileView({
  profile,
  positionHistories,
  unitAssignments,
  roles,
  userEmail,
  successMessage,
  errorMessage,
}: ProfileViewProps) {
  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl rounded-[var(--radius-lg)] border bg-card p-8 text-center text-muted-foreground elevation-1">
        <p>Data profil belum tersedia. Silakan hubungi Admin.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {successMessage && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
      <section className="rounded-[var(--radius-lg)] border bg-card p-5 elevation-1 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 text-xl">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">Profil Saya</p>
            <h1 className="truncate text-2xl font-semibold tracking-normal sm:text-3xl">
              {profile.full_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              NIY {profile.employee_no}
              {profile.units ? ` · ${profile.units.name}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge
                className={
                  profile.is_active
                    ? "border-0 bg-primary/10 text-primary"
                    : "border-0 bg-slate-100 text-slate-600"
                }
              >
                {profile.is_active ? "Aktif" : "Non-aktif"}
              </Badge>
              <Badge variant="secondary">
                {EMPLOYEE_STATUS_LABELS[profile.employee_status] ?? profile.employee_status}
              </Badge>
              {roles.map((role) => (
                <Badge key={role} variant="outline">
                  {ROLE_LABELS[role] ?? role}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Link href="/dashboard/profile/edit" className={buttonVariants()}>
              <Edit3 className="h-4 w-4" />
              Edit Profil
            </Link>
            {profile.units && (
              <div className="flex items-center gap-2 rounded-[var(--radius-full)] border bg-secondary px-3 py-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <span>{profile.units.code}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <InfoCard title="Data Pribadi">
          <Row label="Jenis Kelamin" value={profile.gender === "L" ? "Laki-laki" : "Perempuan"} />
          <Row label="Status Pernikahan" value={profile.marital_status} />
          <Row
            label="Tempat, Tanggal Lahir"
            value={
              profile.birth_place && profile.birth_date
                ? `${profile.birth_place}, ${formatDate(profile.birth_date)}`
                : profile.birth_place ?? (profile.birth_date ? formatDate(profile.birth_date) : null)
            }
            icon={<CalendarDays className="h-3.5 w-3.5" />}
          />
          <Row
            label="Pendidikan Terakhir"
            value={profile.last_education}
            icon={<GraduationCap className="h-3.5 w-3.5" />}
          />
        </InfoCard>

        <InfoCard title="Kontak">
          <Row label="Email" value={userEmail} icon={<Mail className="h-3.5 w-3.5" />} />
          <Row label="No. HP" value={profile.phone} icon={<Phone className="h-3.5 w-3.5" />} />
          <Row label="Alamat KTP" value={profile.address_ktp} icon={<MapPin className="h-3.5 w-3.5" />} />
          <Row label="Alamat Domisili" value={profile.address_domicile} />
          {profile.facebook && <Row label="Facebook" value={profile.facebook} />}
          {profile.instagram && <Row label="Instagram" value={`@${profile.instagram}`} />}
        </InfoCard>

        <InfoCard title="Kepegawaian">
          <Row label="NIY" value={profile.employee_no} icon={<UserRound className="h-3.5 w-3.5" />} />
          <Row label="Unit Induk" value={profile.units?.name} icon={<Building2 className="h-3.5 w-3.5" />} />
          <Row
            label="Status Pegawai"
            value={EMPLOYEE_STATUS_LABELS[profile.employee_status] ?? profile.employee_status}
            icon={<Briefcase className="h-3.5 w-3.5" />}
          />
          <Row label="Status Akun" value={profile.is_active ? "Aktif" : "Non-aktif"} />
        </InfoCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-primary" />
            Histori Jabatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positionHistories.length > 0 ? (
            <div className="space-y-3">
              {positionHistories.map((history) => (
                <div key={history.id} className="flex items-start gap-3 rounded-[var(--radius-md)] border bg-secondary/40 p-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{history.position_name}</span>
                      {history.is_current && (
                        <Badge className="border-0 bg-primary/10 py-0 text-[10px] text-primary">
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {history.units?.name ?? "Yayasan"} · {formatDate(history.start_date)} -{" "}
                      {history.end_date ? formatDate(history.end_date) : "Sekarang"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Belum ada histori jabatan yang tercatat." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Penugasan Unit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unitAssignments.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {unitAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border bg-secondary/40 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{assignment.units?.name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.academic_years?.name ?? "-"}
                    </p>
                  </div>
                  <Badge
                    variant={assignment.assignment_type === "HOME" ? "default" : "outline"}
                    className="shrink-0 text-xs"
                  >
                    {assignment.assignment_type === "HOME" ? "Unit Induk" : "Mengajar"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Belum ada penugasan unit yang tercatat." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-secondary/60 p-3">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={value ? "mt-1 block text-foreground" : "mt-1 block italic text-muted-foreground/60"}>
        {value ?? "-"}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed bg-secondary/30 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}








