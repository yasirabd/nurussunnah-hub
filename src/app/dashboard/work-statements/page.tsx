import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, FileText, RotateCcw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { Json, Profile, ReviewAction, StatementReview, WorkStatement } from "@/types/database";
import {
  reviewWorkStatementAction,
  saveDraftAction,
  submitWorkStatementAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Surat Pernyataan Kerja - Nurussunnah Hub",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  REVIEWED: "Direview",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REOPENED: "Dibuka ulang",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SUBMITTED: "bg-accent text-accent-foreground",
  REVIEWED: "bg-warning/12 text-warning",
  APPROVED: "bg-success/12 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
  REOPENED: "bg-primary/10 text-primary",
};

type StatementContent = {
  position?: string;
  main_tasks?: string;
  teaching_units?: string;
  weekly_load?: string;
  commitment?: string;
  notes?: string;
};

type ProfileWithUnit = Pick<Profile, "id" | "full_name" | "employee_no"> & {
  units?: { name: string; code: string } | null;
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asContent(value: Json | null | undefined): StatementContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as StatementContent;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function messageValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: "success" | "error"
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function WorkStatementsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (rolesData ?? []).map((item) => item.role);
  const canReview =
    roles.includes("HRD") || roles.includes("ADMIN") || roles.includes("KEPALA_UNIT");

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date")
    .eq("is_active", true)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, employee_no, units!profiles_home_unit_id_fkey(name, code)")
    .eq("id", user.id)
    .single();

  const { data: ownStatement } = activeYear
    ? await supabase
        .from("work_statements")
        .select("*")
        .eq("user_id", user.id)
        .eq("academic_year_id", activeYear.id)
        .maybeSingle()
    : { data: null };

  const { data: visibleStatements } =
    activeYear && canReview
      ? await supabase
          .from("work_statements")
          .select("*")
          .eq("academic_year_id", activeYear.id)
          .order("updated_at", { ascending: false })
      : { data: [] };

  const reviewStatements = (visibleStatements ?? []).filter(
    (statement) => statement.user_id !== user.id
  );
  const profileIds = Array.from(
    new Set([user.id, ...reviewStatements.map((statement) => statement.user_id)])
  );

  const { data: reviewProfiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, employee_no, units!profiles_home_unit_id_fkey(name, code)")
        .in("id", profileIds)
    : { data: [] };

  const statementIds = [
    ...(ownStatement ? [ownStatement.id] : []),
    ...reviewStatements.map((statement) => statement.id),
  ];
  const { data: reviews } = statementIds.length
    ? await supabase
        .from("statement_reviews")
        .select("*")
        .in("work_statement_id", statementIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const profilesById = new Map<string, ProfileWithUnit>();
  if (profile) profilesById.set(profile.id, profile as ProfileWithUnit);
  (reviewProfiles ?? []).forEach((item) => profilesById.set(item.id, item as ProfileWithUnit));

  const reviewsByStatement = new Map<string, StatementReview[]>();
  (reviews ?? []).forEach((review) => {
    const existing = reviewsByStatement.get(review.work_statement_id) ?? [];
    reviewsByStatement.set(review.work_statement_id, [...existing, review]);
  });

  const content = asContent(ownStatement?.content);
  const editable =
    !ownStatement || ["DRAFT", "REOPENED", "REJECTED"].includes(ownStatement.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Surat Pernyataan Kerja</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Form surat tahunan, tanda tangan digital, dan review sesuai unit.
          </p>
        </div>
        {activeYear && (
          <Badge className="h-7 w-fit rounded-[var(--radius-full)] border-0 bg-primary/10 px-3 text-primary">
            Tahun Pelajaran {activeYear.name}
          </Badge>
        )}
      </div>

      {messageValue(params, "success") && (
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {messageValue(params, "success")}
        </div>
      )}
      {messageValue(params, "error") && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {messageValue(params, "error")}
        </div>
      )}

      {!activeYear ? (
        <Card>
          <CardHeader>
            <CardTitle>Tahun pelajaran belum aktif</CardTitle>
            <CardDescription>
              Aktifkan tahun pelajaran sebelum pegawai membuat surat.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Form Surat</CardTitle>
                  <CardDescription>
                    Isi data penugasan dan komitmen untuk periode {activeYear.name}.
                  </CardDescription>
                </div>
                <StatusBadge status={ownStatement?.status ?? "DRAFT"} />
              </div>
            </CardHeader>
            <CardContent>
              <form action={saveDraftAction} className="space-y-5">
                <input type="hidden" name="academic_year_id" value={activeYear.id} />
                <Field label="Nama pegawai">
                  <Input value={profile?.full_name ?? ""} disabled />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="NIY">
                    <Input value={profile?.employee_no ?? ""} disabled />
                  </Field>
                  <Field label="Unit induk">
                    <Input value={profile?.units?.name ?? "-"} disabled />
                  </Field>
                </div>
                <Field label="Jabatan/amanah utama">
                  <Input
                    name="position"
                    defaultValue={content.position ?? ""}
                    disabled={!editable}
                    placeholder="Contoh: Guru Kelas, HRD, Kepala Unit"
                  />
                </Field>
                <Field label="Tugas utama">
                  <Textarea
                    name="main_tasks"
                    defaultValue={content.main_tasks ?? ""}
                    disabled={!editable}
                    placeholder="Ringkas tugas pokok yang disepakati untuk tahun pelajaran ini."
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Unit mengajar/bertugas tambahan">
                    <Input
                      name="teaching_units"
                      defaultValue={content.teaching_units ?? ""}
                      disabled={!editable}
                      placeholder="Opsional"
                    />
                  </Field>
                  <Field label="Beban/jam kerja mingguan">
                    <Input
                      name="weekly_load"
                      defaultValue={content.weekly_load ?? ""}
                      disabled={!editable}
                      placeholder="Contoh: 24 JP"
                    />
                  </Field>
                </div>
                <Field label="Komitmen kerja">
                  <Textarea
                    name="commitment"
                    defaultValue={content.commitment ?? ""}
                    disabled={!editable}
                    placeholder="Tuliskan komitmen kerja dan kesediaan mengikuti aturan yayasan."
                  />
                </Field>
                <Field label="Catatan pegawai">
                  <Textarea
                    name="notes"
                    defaultValue={content.notes ?? ""}
                    disabled={!editable}
                    placeholder="Opsional"
                  />
                </Field>
                <Field label="Tanda tangan digital">
                  <Input
                    name="signature_data"
                    defaultValue={ownStatement?.signature_data ?? profile?.full_name ?? ""}
                    disabled={!editable}
                    placeholder="Ketik nama lengkap sebagai tanda tangan digital"
                  />
                </Field>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" variant="outline" disabled={!editable}>
                    Simpan draft
                  </Button>
                  <Button formAction={submitWorkStatementAction} disabled={!editable}>
                    Ajukan review
                  </Button>
                  {ownStatement?.status === "APPROVED" && (
                    <Link
                      href={`/dashboard/work-statements/${ownStatement.id}/print`}
                      className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}
                    >
                      <FileText className="h-4 w-4" />
                      Cetak PDF
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Surat</CardTitle>
                <CardDescription>Ringkasan proses surat aktif.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Status" value={STATUS_LABELS[ownStatement?.status ?? "DRAFT"]} />
                <InfoRow label="Diajukan" value={formatDate(ownStatement?.submitted_at)} />
                <InfoRow label="Ditandatangani" value={formatDate(ownStatement?.signed_at)} />
                <InfoRow label="Diperbarui" value={formatDate(ownStatement?.updated_at)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Riwayat Review</CardTitle>
                <CardDescription>Catatan keputusan reviewer.</CardDescription>
              </CardHeader>
              <CardContent>
                <ReviewHistory reviews={ownStatement ? reviewsByStatement.get(ownStatement.id) : []} />
              </CardContent>
            </Card>
          </aside>
        </section>
      )}

      {activeYear && canReview && (
        <Card>
          <CardHeader>
            <CardTitle>Antrian Review</CardTitle>
            <CardDescription>
              Kepala Unit melihat pegawai unitnya. HRD/Admin melihat seluruh surat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewStatements.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Belum ada surat yang perlu direview.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pegawai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Diajukan</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewStatements.map((statement) => (
                    <ReviewRow
                      key={statement.id}
                      statement={statement}
                      profile={profilesById.get(statement.user_id)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("w-fit border-0", STATUS_CLASS[status])}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function ReviewHistory({ reviews }: { reviews: StatementReview[] | undefined }) {
  if (!reviews?.length) {
    return <p className="text-sm text-muted-foreground">Belum ada review.</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-[var(--radius-md)] border bg-secondary/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={review.action === "REOPENED" ? "REOPENED" : review.action} />
            <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
          </div>
          {review.notes && <p className="mt-2 text-sm leading-6">{review.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function ReviewRow({
  statement,
  profile,
}: {
  statement: WorkStatement;
  profile: ProfileWithUnit | undefined;
}) {
  const canMarkReviewed = statement.status === "SUBMITTED";
  const canDecide = statement.status === "SUBMITTED" || statement.status === "REVIEWED";
  const canReopen = statement.status === "APPROVED" || statement.status === "REJECTED";

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-48">
          <p className="font-medium">{profile?.full_name ?? "Pegawai"}</p>
          <p className="text-xs text-muted-foreground">
            {profile?.employee_no ?? "-"} · {profile?.units?.name ?? "-"}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={statement.status} />
      </TableCell>
      <TableCell>{formatDate(statement.submitted_at)}</TableCell>
      <TableCell>
        <form id={`review-${statement.id}`} action={reviewWorkStatementAction}>
          <input type="hidden" name="work_statement_id" value={statement.id} />
          <Textarea
            name="notes"
            className="min-h-16 min-w-56"
            placeholder="Catatan reviewer"
          />
        </form>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <ReviewButton
            formId={`review-${statement.id}`}
            action="REVIEWED"
            disabled={!canMarkReviewed}
            variant="outline"
          >
            <CheckCircle2 className="h-4 w-4" />
            Review
          </ReviewButton>
          <ReviewButton formId={`review-${statement.id}`} action="APPROVED" disabled={!canDecide}>
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </ReviewButton>
          <ReviewButton
            formId={`review-${statement.id}`}
            action="REJECTED"
            disabled={!canDecide}
            variant="destructive"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </ReviewButton>
          <ReviewButton
            formId={`review-${statement.id}`}
            action="REOPENED"
            disabled={!canReopen}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4" />
            Reopen
          </ReviewButton>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ReviewButton({
  formId,
  action,
  disabled,
  variant = "default",
  children,
}: {
  formId: string;
  action: ReviewAction;
  disabled: boolean;
  variant?: "default" | "outline" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      form={formId}
      name="action"
      value={action}
      disabled={disabled}
      variant={variant}
      size="sm"
    >
      {children}
    </Button>
  );
}
