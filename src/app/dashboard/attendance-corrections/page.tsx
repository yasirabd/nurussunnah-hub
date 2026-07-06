import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardUserContext } from "@/lib/auth/user-context";
import { cn } from "@/lib/utils";
import { CorrectionForm } from "./_components/correction-form";
import { CorrectionReviewForm } from "./_components/correction-review-form";
import { DownloadCorrectionRecapExcel } from "./_components/download-correction-recap-excel";

export const metadata: Metadata = { title: "Koreksi Presensi" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
};
const KIND_LABEL: Record<string, string> = {
  LUPA_TAP: "Lupa Tap Kartu",
  KARTU_TERTINGGAL: "Kartu Tertinggal",
  KARTU_HILANG_RUSAK: "Kartu Hilang/Rusak",
  KENDALA_SISTEM: "Kendala Sistem",
};
const SCOPE_LABEL: Record<string, string> = {
  MASUK: "Masuk",
  PULANG: "Pulang",
  KEDUANYA: "Keduanya",
};

function correctionTimeLabel(row: {
  time_scope: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
}) {
  const times = [];
  if (row.requested_check_in) times.push(`Masuk ${row.requested_check_in.slice(0, 5)}`);
  if (row.requested_check_out) times.push(`Pulang ${row.requested_check_out.slice(0, 5)}`);
  return `${SCOPE_LABEL[row.time_scope] ?? row.time_scope}${times.length ? ` (${times.join(", ")})` : ""}`;
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "DISETUJUI") return "default";
  if (s === "DITOLAK") return "destructive";
  return "secondary";
}
function param(sp: Record<string, string | string[] | undefined>, k: string) {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

function simpleParams(sp: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(sp).flatMap(([key, value]) => {
      const normalized = Array.isArray(value) ? value[0] : value;
      return normalized ? [[key, normalized]] : [];
    })
  );
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function dateFilterArgs(searchParams: Record<string, string>) {
  return {
    p_start_date: searchParams.correctionStartDate || null,
    p_end_date: searchParams.correctionEndDate || null,
  };
}

export default async function CorrectionsPage({ searchParams }: PageProps) {
  const ctx = await getDashboardUserContext();
  if (!ctx) return null;

  const { supabase, user, profile, isHrd, isAdmin, isKepalaUnit } = ctx;
  const canValidate = isHrd || isAdmin;
  const sp = (await searchParams) ?? {};
  const activeTab = param(sp, "tab") ?? "ajukan";
  const success = param(sp, "success");
  const error = param(sp, "error");
  const simpleSp = simpleParams(sp);

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("name")
    .eq("is_active", true)
    .maybeSingle();
  const yearName = activeYear?.name ?? "-";

  const tabs = [
    { key: "ajukan", label: "Ajukan Koreksi", show: true },
    { key: "riwayat", label: "Koreksi Saya", show: true },
    { key: "unit", label: "Unit Saya", show: isKepalaUnit },
    { key: "validasi", label: "Validasi", show: canValidate },
    { key: "rekap", label: "Rekap", show: canValidate },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Koreksi Presensi</h1>
        <p className="text-sm text-muted-foreground">
          Untuk kasus tetap masuk kerja tapi presensi tidak tercatat (lupa tap, kartu hilang, dll).
        </p>
      </div>

      {success && <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{success}</div>}
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.filter((t) => t.show).map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/attendance-corrections?tab=${t.key}`}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm font-medium",
              activeTab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {activeTab === "ajukan" && (
        <Card>
          <CardHeader>
            <CardTitle>Formulir Koreksi Presensi</CardTitle>
            <CardDescription>Data diri terisi otomatis dari profil Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <CorrectionForm
              fullName={profile?.full_name ?? "-"}
              unitName={profile?.units?.name ?? "-"}
              phone={profile?.phone ?? ""}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "riwayat" && (await MyHistory({ supabase, userId: user.id, yearName }))}
      {activeTab === "unit" && isKepalaUnit && (await UnitCounts({ supabase, yearName, searchParams: simpleSp }))}
      {activeTab === "validasi" && canValidate && (await ValidationList({ supabase }))}
      {activeTab === "rekap" && canValidate && (await Recap({ supabase, yearName, searchParams: simpleSp }))}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function MyHistory({ supabase, userId, yearName }: { supabase: any; userId: string; yearName: string }) {
  const [{ data: rows }, { data: summary }] = await Promise.all([
    supabase
      .from("attendance_corrections")
      .select("id, event_date, correction_kind, time_scope, requested_check_in, requested_check_out, status, admin_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.rpc("my_correction_summary_active_year"),
  ]);
  const total = (summary ?? []).reduce((a: number, r: any) => a + Number(r.total), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Tahun Pelajaran {yearName}</CardTitle>
          <CardDescription>Total {total} pengajuan koreksi</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(summary ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada pengajuan tahun ini.</p>
          )}
          {(summary ?? []).map((r: any) => (
            <Badge key={r.correction_kind} variant="secondary">
              {KIND_LABEL[r.correction_kind] ?? r.correction_kind}: {r.total}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Riwayat Koreksi Saya</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.event_date}</TableCell>
                  <TableCell>{KIND_LABEL[r.correction_kind] ?? r.correction_kind}</TableCell>
                  <TableCell>{correctionTimeLabel(r)}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                </TableRow>
              ))}
              {(rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada pengajuan.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

async function UnitCounts({
  supabase,
  yearName,
  searchParams,
}: {
  supabase: any;
  yearName: string;
  searchParams: Record<string, string>;
}) {
  const filters = dateFilterArgs(searchParams);
  const { data: rows } = await supabase.rpc("unit_correction_day_recap_active_year", filters);
  const allRows = rows ?? [];
  const page = positiveInt(searchParams.correctionUnitPage, 1);
  const pageSize = positiveInt(searchParams.correctionUnitPageSize, 10);
  const pagedRows = allRows.slice((page - 1) * pageSize, page * pageSize);
  const totalDays = allRows.reduce((sum: number, row: any) => sum + Number(row.total_correction_days ?? 0), 0);
  const activeEmployees = allRows.filter((row: any) => Number(row.total_correction_days ?? 0) > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Rekap Koreksi Pegawai Unit</CardTitle>
            <CardDescription>Tahun Pelajaran {yearName}. Hanya pegawai aktif.</CardDescription>
          </div>
          <DownloadCorrectionRecapExcel
            perEmployee={allRows as any}
            byKind={[]}
            byUnit={[]}
            stats={{ total_requests: totalDays, distinct_employees: activeEmployees }}
            yearName={yearName}
            includeKindAndUnitSheets={false}
            dateRange={{
              startDate: searchParams.correctionStartDate,
              endDate: searchParams.correctionEndDate,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CorrectionDateFilterForm tab="unit" searchParams={searchParams} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No. Pegawai</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Hari Dikoreksi</TableHead>
              <TableHead className="text-right">Lupa Tap</TableHead>
              <TableHead className="text-right">Kartu Tertinggal</TableHead>
              <TableHead className="text-right">Kartu Hilang/Rusak</TableHead>
              <TableHead className="text-right">Kendala Sistem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((r: any) => (
              <TableRow key={r.user_id}>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>{r.employee_no}</TableCell>
                <TableCell>{r.unit_name ?? "-"}</TableCell>
                <TableCell className="text-right">{r.total_correction_days}</TableCell>
                <TableCell className="text-right">{r.lupa_tap_days}</TableCell>
                <TableCell className="text-right">{r.kartu_tertinggal_days}</TableCell>
                <TableCell className="text-right">{r.kartu_hilang_rusak_days}</TableCell>
                <TableCell className="text-right">{r.kendala_sistem_days}</TableCell>
              </TableRow>
            ))}
            {pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataPagination
          basePath="/dashboard/attendance-corrections"
          searchParams={{ ...searchParams, tab: "unit" }}
          pageParam="correctionUnitPage"
          pageSizeParam="correctionUnitPageSize"
          page={page}
          pageSize={pageSize}
          total={allRows.length}
          itemLabel="pegawai"
        />
      </CardContent>
    </Card>
  );
}

function CorrectionDateFilterForm({
  tab,
  searchParams,
}: {
  tab: "unit" | "rekap";
  searchParams: Record<string, string>;
}) {
  return (
    <form action="/dashboard/attendance-corrections" className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-end">
      <input type="hidden" name="tab" value={tab} />
      <div className="space-y-1.5">
        <Label htmlFor={`${tab}-correction-start-date`}>Tanggal Mulai</Label>
        <Input
          id={`${tab}-correction-start-date`}
          name="correctionStartDate"
          type="date"
          defaultValue={searchParams.correctionStartDate ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${tab}-correction-end-date`}>Tanggal Selesai</Label>
        <Input
          id={`${tab}-correction-end-date`}
          name="correctionEndDate"
          type="date"
          defaultValue={searchParams.correctionEndDate ?? ""}
        />
      </div>
      <Button type="submit" variant="outline">Terapkan Filter</Button>
      {(searchParams.correctionStartDate || searchParams.correctionEndDate) && (
        <Link
          href={`/dashboard/attendance-corrections?tab=${tab}`}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-full)] px-5 text-sm font-medium hover:bg-primary/6 hover:text-primary"
        >
          Reset
        </Link>
      )}
    </form>
  );
}

async function ValidationList({ supabase }: { supabase: any }) {
  const { data: rows } = await supabase
    .from("attendance_corrections")
    .select("id, event_date, correction_kind, time_scope, requested_check_in, requested_check_out, reason, status, admin_note, profiles:profiles!attendance_corrections_user_id_fkey(full_name), units:units!attendance_corrections_unit_id_fkey(name), attendance_correction_attachments(drive_view_link, file_name)")
    .order("created_at", { ascending: false });

  const allRows = rows ?? [];
  const summary = allRows.reduce(
    (acc: Record<string, number>, row: any) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    { total: 0, MENUNGGU: 0, DISETUJUI: 0, DITOLAK: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ValidationSummaryCard label="Total" value={summary.total} />
        <ValidationSummaryCard label="Menunggu" value={summary.MENUNGGU} />
        <ValidationSummaryCard label="Disetujui" value={summary.DISETUJUI} />
        <ValidationSummaryCard label="Ditolak" value={summary.DITOLAK} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validasi Koreksi</CardTitle>
          <CardDescription>Setujui akan otomatis meng-update data presensi hari tersebut.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pegawai</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.profiles?.full_name ?? "-"}</TableCell>
                  <TableCell>{r.units?.name ?? "-"}</TableCell>
                  <TableCell>{r.event_date}</TableCell>
                  <TableCell>{KIND_LABEL[r.correction_kind] ?? r.correction_kind}</TableCell>
                  <TableCell>{correctionTimeLabel(r)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(r.attendance_correction_attachments ?? []).map((a: any, i: number) => (
                        <a
                          key={i}
                          href={a.drive_view_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          Lihat Bukti
                        </a>
                      ))}
                      {(r.attendance_correction_attachments ?? []).length === 0 && "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                        Validasi
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Validasi Koreksi Presensi</DialogTitle>
                          <DialogDescription>
                            {r.profiles?.full_name ?? "-"} · {KIND_LABEL[r.correction_kind] ?? r.correction_kind} · {r.event_date}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-md border bg-muted/30 p-3 text-sm">
                          <p className="font-medium">Keterangan</p>
                          <p className="mt-1 text-muted-foreground">{r.reason}</p>
                        </div>
                        <CorrectionReviewForm id={r.id} currentStatus={r.status} currentNote={r.admin_note} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {allRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Belum ada pengajuan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ValidationSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}


async function Recap({
  supabase,
  yearName,
  searchParams,
}: {
  supabase: any;
  yearName: string;
  searchParams: Record<string, string>;
}) {
  const filters = dateFilterArgs(searchParams);
  const [{ data: perEmployee }, { data: byKind }, { data: byUnit }, { data: statsRows }] =
    await Promise.all([
      supabase.rpc("unit_correction_day_recap_active_year", filters),
      supabase.rpc("correction_recap_by_kind_active_year"),
      supabase.rpc("correction_recap_by_unit_active_year"),
      supabase.rpc("correction_recap_stats_active_year"),
    ]);
  const stats = (statsRows ?? [])[0] ?? { total_requests: 0, distinct_employees: 0 };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pengajuan Koreksi (TP {yearName})</CardDescription>
            <CardTitle className="text-3xl">{stats.total_requests ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pegawai Mengajukan</CardDescription>
            <CardTitle className="text-3xl">
              {stats.distinct_employees ?? 0} <span className="text-base font-normal">orang</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Koreksi per Jenis</CardTitle>
            <CardDescription>Tahun Pelajaran {yearName}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Koreksi</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(byKind ?? []).map((r: any) => (
                  <TableRow key={r.correction_kind}>
                    <TableCell>{KIND_LABEL[r.correction_kind] ?? r.correction_kind}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                  </TableRow>
                ))}
                {(byKind ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Koreksi per Unit</CardTitle>
            <CardDescription>Tahun Pelajaran {yearName}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(byUnit ?? []).map((r: any) => (
                  <TableRow key={r.unit_name}>
                    <TableCell>{r.unit_name}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                  </TableRow>
                ))}
                {(byUnit ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Koreksi per Pegawai (Aktif)</CardTitle>
              <CardDescription>Tahun Pelajaran {yearName}. Hanya pegawai berstatus aktif.</CardDescription>
            </div>
            <DownloadCorrectionRecapExcel
              perEmployee={(perEmployee ?? []) as any}
              byKind={(byKind ?? []) as any}
              byUnit={(byUnit ?? []) as any}
              stats={stats}
              yearName={yearName}
              dateRange={{
                startDate: searchParams.correctionStartDate,
                endDate: searchParams.correctionEndDate,
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CorrectionDateFilterForm tab="rekap" searchParams={searchParams} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Hari Dikoreksi</TableHead>
                <TableHead className="text-right">Lupa Tap</TableHead>
                <TableHead className="text-right">Kartu Tertinggal</TableHead>
                <TableHead className="text-right">Kartu Hilang/Rusak</TableHead>
                <TableHead className="text-right">Kendala Sistem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(perEmployee ?? []).map((r: any) => (
                <TableRow key={r.user_id}>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell>{r.unit_name ?? "-"}</TableCell>
                  <TableCell className="text-right">{r.total_correction_days}</TableCell>
                  <TableCell className="text-right">{r.lupa_tap_days}</TableCell>
                  <TableCell className="text-right">{r.kartu_tertinggal_days}</TableCell>
                  <TableCell className="text-right">{r.kartu_hilang_rusak_days}</TableCell>
                  <TableCell className="text-right">{r.kendala_sistem_days}</TableCell>
                </TableRow>
              ))}
              {(perEmployee ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
