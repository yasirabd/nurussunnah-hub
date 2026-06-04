import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Eye, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  FeedbackTargetCarousel,
  type FeedbackTarget,
} from "./feedback-target-carousel";

export const metadata: Metadata = { title: "Feedback Rekan Kerja" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

type UnitOption = {
  key: string;
  label: string;
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

function paramValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function pageSizeValue(value: string | undefined) {
  const parsed = positiveInt(value, 10);
  return [10, 25, 50].includes(parsed) ? parsed : 10;
}

function unitKey(row: { unit_code: string | null; unit_name: string | null }) {
  return row.unit_code || row.unit_name || "__none";
}

function unitLabel(row: { unit_code: string | null; unit_name: string | null }) {
  return row.unit_name || row.unit_code || "Tanpa unit";
}

function unitOptions<T extends { unit_code: string | null; unit_name: string | null }>(
  rows: T[]
) {
  const options = new Map<string, string>();
  rows.forEach((row) => options.set(unitKey(row), unitLabel(row)));
  return Array.from(options, ([key, label]) => ({ key, label })).sort((a, b) =>
    a.label.localeCompare(b.label, "id")
  );
}

function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(page, pageCount(total, pageSize));
}

function pageSlice<T>(rows: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

function buildFeedbackHref(
  params: Record<string, string | string[] | undefined>,
  updates: Record<string, string | number | null>
) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === "success" || key === "error") return;
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) next.set(key, normalized);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  });
  const query = next.toString();
  return query ? `/dashboard/feedback?${query}` : "/dashboard/feedback";
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
  const canViewIdentified = roles.includes("HRD") || roles.includes("ADMIN");
  const canMonitor = canViewIdentified || roles.includes("KEPALA_UNIT");

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
    activeYear && canViewIdentified
      ? await supabase.rpc("get_feedback_identified", {
          p_academic_year_id: activeYear.id,
        })
      : { data: [] };

  const targets = (targetsData ?? []) as FeedbackTarget[];
  const received = receivedData ?? [];
  const monitoring = (monitoringData ?? []) as MonitoringRow[];
  const identified = (identifiedData ?? []) as IdentifiedFeedback[];
  const monitorUnit = paramValue(params, "monitorUnit") ?? "all";
  const identifiedUnit = canViewIdentified
    ? paramValue(params, "identifiedUnit") ?? "all"
    : "all";
  const monitorPageSize = pageSizeValue(paramValue(params, "monitorPageSize"));
  const identifiedPageSize = pageSizeValue(paramValue(params, "identifiedPageSize"));
  const monitorOptions = unitOptions(monitoring);
  const identifiedOptions = unitOptions(identified);
  const filteredMonitoring =
    monitorUnit === "all"
      ? monitoring
      : monitoring.filter((row) => unitKey(row) === monitorUnit);
  const filteredIdentified =
    identifiedUnit === "all"
      ? identified
      : identified.filter((row) => unitKey(row) === identifiedUnit);
  const monitorPage = clampPage(
    positivePage(paramValue(params, "monitorPage")),
    filteredMonitoring.length,
    monitorPageSize
  );
  const identifiedPage = canViewIdentified
    ? clampPage(
        positivePage(paramValue(params, "identifiedPage")),
        filteredIdentified.length,
        identifiedPageSize
      )
    : 1;
  const pagedMonitoring = pageSlice(filteredMonitoring, monitorPage, monitorPageSize);
  const pagedIdentified = pageSlice(filteredIdentified, identifiedPage, identifiedPageSize);
  const monitorTotalPages = pageCount(filteredMonitoring.length, monitorPageSize);
  const identifiedTotalPages = pageCount(filteredIdentified.length, identifiedPageSize);
  const unitReminderProgress = buildUnitReminderProgress(monitoring);
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
                <FeedbackTargetCarousel targets={targets} academicYearId={activeYear.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Masuk</CardTitle>
                <CardDescription>
                  Identitas pemberi tidak ditampilkan di area pegawai.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {received.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada feedback masuk.</p>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {received.map((item) => (
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {canMonitor && (
            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pengingat Feedback</CardTitle>
                  <CardDescription>Progress penyelesaian feedback per unit.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {unitReminderProgress.length === 0 ? (
                    <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground md:col-span-2">
                      Belum ada data monitoring feedback.
                    </p>
                  ) : (
                    unitReminderProgress.map((unit) => (
                      <div key={unit.key} className="rounded-[var(--radius-md)] border bg-secondary/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{unit.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {unit.incompleteEmployees} pegawai belum selesai
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "border-0",
                              unit.percent === 100
                                ? "bg-primary/10 text-primary"
                                : "bg-warning/12 text-warning"
                            )}
                          >
                            {unit.percent}%
                          </Badge>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${unit.percent}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {unit.completedTargets}/{unit.totalTargets} target feedback selesai
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle>Monitoring Feedback</CardTitle>
                      <CardDescription>
                        Progress penyelesaian feedback wajib per pegawai aktif.
                      </CardDescription>
                    </div>
                    <UnitFilterForm
                      name="monitorUnit"
                      value={monitorUnit}
                      options={monitorOptions}
                      hiddenFields={{
                        identifiedUnit,
                        identifiedPage,
                        identifiedPageSize,
                        monitorPageSize,
                        monitorPage: 1,
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TableMeta
                    total={filteredMonitoring.length}
                    page={monitorPage}
                    totalPages={monitorTotalPages}
                    resetHref={buildFeedbackHref(params, { monitorUnit: null, monitorPage: null })}
                    showReset={monitorUnit !== "all"}
                  />
                  {filteredMonitoring.length === 0 ? (
                    <EmptyTable message="Tidak ada pegawai pada filter unit ini." />
                  ) : (
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
                        {pagedMonitoring.map((row) => (
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
                  )}
                  <PaginationLinks
                    page={monitorPage}
                    totalPages={monitorTotalPages}
                    pageHref={(page) => buildFeedbackHref(params, { monitorPage: page })}
                  />
                </CardContent>
              </Card>

              {canViewIdentified && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <CardTitle>Feedback Teridentifikasi</CardTitle>
                        <CardDescription>
                          Area ini hanya untuk HRD/Admin dan menampilkan identitas pemberi.
                        </CardDescription>
                      </div>
                      <UnitFilterForm
                        name="identifiedUnit"
                        value={identifiedUnit}
                        options={identifiedOptions}
                        hiddenFields={{
                          monitorUnit,
                          monitorPage,
                          monitorPageSize,
                          identifiedPageSize,
                          identifiedPage: 1,
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TableMeta
                      total={filteredIdentified.length}
                      page={identifiedPage}
                      totalPages={identifiedTotalPages}
                      resetHref={buildFeedbackHref(params, { identifiedUnit: null, identifiedPage: null })}
                      showReset={identifiedUnit !== "all"}
                    />
                    {filteredIdentified.length === 0 ? (
                      <EmptyTable message="Belum ada feedback yang sesuai filter." />
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
                          {pagedIdentified.map((item) => (
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
                    <PaginationLinks
                      page={identifiedPage}
                      totalPages={identifiedTotalPages}
                      pageHref={(page) => buildFeedbackHref(params, { identifiedPage: page })}
                    />
                  </CardContent>
                </Card>
              )}
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

function buildUnitReminderProgress(rows: MonitoringRow[]) {
  const map = new Map<
    string,
    {
      key: string;
      label: string;
      completedTargets: number;
      totalTargets: number;
      incompleteEmployees: number;
    }
  >();

  rows.forEach((row) => {
    const key = unitKey(row);
    const current = map.get(key) ?? {
      key,
      label: unitLabel(row),
      completedTargets: 0,
      totalTargets: 0,
      incompleteEmployees: 0,
    };
    current.completedTargets += row.completed_count;
    current.totalTargets += row.target_count;
    if (!row.is_complete) current.incompleteEmployees += 1;
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((unit) => ({
      ...unit,
      percent: unit.totalTargets
        ? Math.round((unit.completedTargets / unit.totalTargets) * 100)
        : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "id"));
}

function UnitFilterForm({
  name,
  value,
  options,
  hiddenFields,
}: {
  name: string;
  value: string;
  options: UnitOption[];
  hiddenFields: Record<string, string | number>;
}) {
  return (
    <form action="/dashboard/feedback" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {Object.entries(hiddenFields).map(([key, fieldValue]) =>
        fieldValue && fieldValue !== "all" ? (
          <input key={key} type="hidden" name={key} value={fieldValue} />
        ) : null
      )}
      <select
        name={name}
        defaultValue={value}
        className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="all">Semua unit</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <button className="h-10 rounded-[var(--radius-full)] bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
        Filter
      </button>
    </form>
  );
}

function TableMeta({
  total,
  page,
  totalPages,
  resetHref,
  showReset,
}: {
  total: number;
  page: number;
  totalPages: number;
  resetHref: string;
  showReset: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total} data - halaman {page}/{totalPages}
      </span>
      {showReset && (
        <Link className="text-primary hover:underline" href={resetHref}>
          Reset filter
        </Link>
      )}
    </div>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <p className="rounded-[var(--radius-md)] border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function PaginationLinks({
  page,
  totalPages,
  pageHref,
}: {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = paginationWindow(page, totalPages);

  return (
    <Table>
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PaginationButton
                disabled={page <= 1}
                href={pageHref(page - 1)}
                label="Sebelumnya"
              />
              {pages.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`${item}-${index}`} className="px-1 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={pageHref(item)}
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-full)] border px-2 text-sm font-medium",
                      item === page
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-primary/6"
                    )}
                  >
                    {item}
                  </Link>
                )
              )}
              <PaginationButton
                disabled={page >= totalPages}
                href={pageHref(page + 1)}
                label="Berikutnya"
              />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function paginationWindow(page: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push("ellipsis");
  for (let item = start; item <= end; item += 1) pages.push(item);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

function PaginationButton({
  disabled,
  href,
  label,
}: {
  disabled: boolean;
  href: string;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-[var(--radius-full)] border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
        {label}
      </span>
    );
  }

  return (
    <Link className="rounded-[var(--radius-full)] border px-3 py-1.5 text-sm font-medium hover:bg-primary/6" href={href}>
      {label}
    </Link>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <Badge variant="secondary" className="border-0 bg-primary/10 text-primary">
      Rating {rating}/5
    </Badge>
  );
}


