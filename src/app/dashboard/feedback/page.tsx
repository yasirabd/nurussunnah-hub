import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Eye, MessageSquareMore, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { submitFeedbackAction } from "./actions";

export const metadata: Metadata = { title: "Feedback Rekan Kerja" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FeedbackTarget = {
  receiver_user_id: string;
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  unit_code: string | null;
  rating: number | null;
  feedback_text: string | null;
  is_completed: boolean;
  feedback_id: string | null;
};

type MonitoringRow = {
  user_id: string;
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  unit_code: string | null;
  target_count: number;
  completed_count: number;
  is_complete: boolean;
};

type IdentifiedFeedback = {
  feedback_id: string;
  giver_name: string;
  receiver_name: string;
  unit_name: string | null;
  unit_code: string | null;
  rating: number;
  feedback_text: string | null;
  created_at: string;
};

function formatDate(value: string) {
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

export default async function FeedbackPage({ searchParams }: PageProps) {
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
  const canMonitor = roles.includes("HRD") || roles.includes("ADMIN") || roles.includes("KEPALA_UNIT");

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date")
    .eq("is_active", true)
    .single();

  const { data: targetsData } = activeYear
    ? await supabase.rpc("get_feedback_targets", {
        p_academic_year_id: activeYear.id,
      })
    : { data: [] };

  const { data: receivedData } = activeYear
    ? await supabase.rpc("get_received_feedback_anonymous", {
        p_academic_year_id: activeYear.id,
      })
    : { data: [] };

  const { data: monitoringData } =
    activeYear && canMonitor
      ? await supabase.rpc("get_feedback_monitoring_scoped", {
          p_academic_year_id: activeYear.id,
        })
      : { data: [] };

  const { data: identifiedData } =
    activeYear && canMonitor
      ? await supabase.rpc("get_feedback_identified", {
          p_academic_year_id: activeYear.id,
        })
      : { data: [] };

  const targets = (targetsData ?? []) as FeedbackTarget[];
  const received = receivedData ?? [];
  const monitoring = (monitoringData ?? []) as MonitoringRow[];
  const identified = (identifiedData ?? []) as IdentifiedFeedback[];
  const completedCount = targets.filter((target) => target.is_completed).length;
  const targetCount = targets.length;
  const completionPercent = targetCount
    ? Math.round((completedCount / targetCount) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Feedback Rekan Kerja</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Isi feedback untuk seluruh rekan aktif dalam cakupan unit Anda.
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
              Aktifkan tahun pelajaran sebelum feedback wajib dibuka.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={Users}
              label="Target feedback"
              value={targetCount.toString()}
              helper="Rekan aktif dalam cakupan unit"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Selesai"
              value={`${completedCount}/${targetCount}`}
              helper={`${completionPercent}% kewajiban selesai`}
            />
            <MetricCard
              icon={Eye}
              label="Feedback masuk"
              value={received.length.toString()}
              helper="Ditampilkan anonim untuk penerima"
            />
          </section>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Progress Kewajiban</CardTitle>
                  <CardDescription>
                    Maksimal satu feedback per rekan untuk periode aktif.
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "w-fit border-0",
                    completionPercent === 100
                  ? "bg-primary/10 text-primary"
                      : "bg-warning/12 text-warning"
                  )}
                >
                  {completionPercent}% selesai
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Rekan</CardTitle>
                <CardDescription>
                  Feedback dapat diperbarui, tetapi tetap satu baris per pasangan pemberi dan penerima.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {targets.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada target feedback untuk akun ini.
                  </p>
                ) : (
                  targets.map((target) => (
                    <FeedbackTargetCard
                      key={target.receiver_user_id}
                      target={target}
                      academicYearId={activeYear.id}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Masuk</CardTitle>
                <CardDescription>
                  Identitas pemberi tidak ditampilkan di area pegawai.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {received.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada feedback masuk.</p>
                ) : (
                  received.map((item) => (
        <div key={item.feedback_id} className="rounded-[var(--radius-md)] border bg-secondary/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <RatingBadge rating={item.rating} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6">
                        {item.feedback_text || "Tanpa catatan tertulis."}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          {canMonitor && (
            <section className="space-y-6">
              {monitoring.some((row) => !row.is_complete) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pengingat Feedback</CardTitle>
                    <CardDescription>Pegawai berikut belum menyelesaikan kewajiban feedback.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {monitoring.filter((row) => !row.is_complete).map((row) => (
                      <Badge key={row.user_id} variant="secondary" className="border-0 bg-warning/12 text-warning">
                        {row.full_name}: {row.completed_count}/{row.target_count}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Feedback</CardTitle>
                  <CardDescription>
                    Progress penyelesaian feedback wajib per pegawai aktif.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pegawai</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitoring.map((row) => (
                        <TableRow key={row.user_id}>
                          <TableCell>
                            <p className="font-medium">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground">{row.employee_no}</p>
                          </TableCell>
                          <TableCell>{row.unit_name ?? "-"}</TableCell>
                          <TableCell>
                            {row.completed_count}/{row.target_count}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "border-0",
                                row.is_complete
                  ? "bg-primary/10 text-primary"
                                  : "bg-warning/12 text-warning"
                              )}
                            >
                              {row.is_complete ? "Selesai" : "Belum selesai"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feedback Teridentifikasi</CardTitle>
                  <CardDescription>
                    Area ini hanya untuk HRD/Admin dan menampilkan identitas pemberi.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {identified.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
                      Belum ada feedback yang dikirim.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pemberi</TableHead>
                          <TableHead>Penerima</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead>Waktu</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {identified.map((item) => (
                          <TableRow key={item.feedback_id}>
                            <TableCell>{item.giver_name}</TableCell>
                            <TableCell>
                              <p className="font-medium">{item.receiver_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.unit_name ?? "-"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <RatingBadge rating={item.rating} />
                            </TableCell>
                            <TableCell className="max-w-sm whitespace-normal leading-6">
                              {item.feedback_text || "-"}
                            </TableCell>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function FeedbackTargetCard({
  target,
  academicYearId,
}: {
  target: FeedbackTarget;
  academicYearId: string;
}) {
  return (
    <form action={submitFeedbackAction} className="rounded-[var(--radius-lg)] border bg-card p-4 elevation-1">
      <input type="hidden" name="academic_year_id" value={academicYearId} />
      <input type="hidden" name="receiver_user_id" value={target.receiver_user_id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{target.full_name}</h2>
            {target.is_completed && (
              <Badge className="border-0 bg-primary/10 text-primary">
                Selesai
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {target.employee_no} · {target.unit_name ?? "-"}
          </p>
        </div>
        <div className="w-full sm:w-32">
          <Label htmlFor={`rating-${target.receiver_user_id}`}>Rating</Label>
          <select
            id={`rating-${target.receiver_user_id}`}
            name="rating"
            defaultValue={target.rating ?? 5}
            className="mt-2 h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`feedback-${target.receiver_user_id}`}>Catatan feedback</Label>
        <Textarea
          id={`feedback-${target.receiver_user_id}`}
          name="feedback_text"
          defaultValue={target.feedback_text ?? ""}
          placeholder="Tuliskan apresiasi, masukan, atau catatan kerja yang relevan."
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm">
          <MessageSquareMore className="h-4 w-4" />
          {target.is_completed ? "Perbarui feedback" : "Kirim feedback"}
        </Button>
      </div>
    </form>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <Badge variant="secondary" className="border-0 bg-primary/10 text-primary">
      Rating {rating}/5
    </Badge>
  );
}


