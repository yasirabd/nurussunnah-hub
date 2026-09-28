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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardUserContext } from "@/lib/auth/user-context";
import { loadRequestRecapDetails } from "@/lib/request-recap-details.mjs";
import { cn } from "@/lib/utils";
import { leaveDateFilter } from "@/lib/leave-date-filter.mjs";
import { LEAVE_CATEGORIES, LEAVE_DAY_DESCRIPTION, loadUnitLeaveDayRecap } from "@/lib/unit-leave-recap.mjs";
import { LeaveRequestForm } from "./_components/leave-request-form";
import { LeaveReviewForm } from "./_components/leave-review-form";
import { DownloadLeaveRecapExcel } from "./_components/download-leave-recap-excel";
import { DownloadUnitLeaveExcel, type UnitLeaveRow } from "./_components/download-unit-leave-excel";

export const metadata: Metadata = { title: "Izin Pegawai" };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  PERLU_REVISI: "Perlu Revisi",
};

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "DISETUJUI") return "default";
  if (s === "DITOLAK") return "destructive";
  if (s === "PERLU_REVISI") return "outline";
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

export default async function LeaveRequestsPage({ searchParams }: PageProps) {
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

  const tabs: { key: string; label: string; show: boolean }[] = [
    { key: "ajukan", label: "Ajukan Izin", show: true },
    { key: "riwayat", label: "Izin Saya", show: true },
    { key: "unit", label: "Unit Saya", show: isKepalaUnit },
    { key: "validasi", label: "Validasi", show: canValidate },
    { key: "rekap", label: "Rekap", show: canValidate },
  ];

  const unitName = profile?.units?.name ?? "-";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Izin Pegawai</h1>
        <p className="text-sm text-muted-foreground">
          Pengajuan izin tidak masuk / terlambat / pulang awal.
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Tab nav via URL query */}
      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.filter((t) => t.show).map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/leave-requests?tab=${t.key}`}
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
            <CardTitle>Formulir Izin</CardTitle>
            <CardDescription>Data diri terisi otomatis dari profil Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestForm
              fullName={profile?.full_name ?? "-"}
              unitName={unitName}
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
      .from("leave_requests")
      .select("id, start_date, end_date, leave_category, leave_time_type, status, admin_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.rpc("my_leave_summary_active_year"),
  ]);

  const total = (summary ?? []).reduce((a: number, r: any) => a + Number(r.total), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Tahun Pelajaran {yearName}</CardTitle>
          <CardDescription>Total {total} pengajuan izin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(summary ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada pengajuan tahun ini.</p>
          )}
          {(summary ?? []).map((r: any) => (
            <Badge key={r.leave_category} variant="secondary">
              {r.leave_category}: {r.total}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Izin Saya</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.start_date}
                    {r.end_date !== r.start_date ? ` s/d ${r.end_date}` : ""}
                  </TableCell>
                  <TableCell>{r.leave_category}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.admin_note ?? "-"}</TableCell>
                </TableRow>
              ))}
              {(rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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

async function UnitCounts({
  supabase,
  yearName,
  searchParams,
}: {
  supabase: any;
  yearName: string;
  searchParams: Record<string, string>;
}) {
  const dates = leaveDateFilter(searchParams);
  const filter = <LeaveDateFilterForm tab="unit" dates={dates} />;
  if (dates.error) return filter;
  let allRows: UnitLeaveRow[];
  let details: Record<string, string>[];
  try {
    allRows = await loadUnitLeaveDayRecap(supabase, dates);
    details = await loadRequestRecapDetails(supabase, "leave_requests", allRows, dates.startDate, dates.endDate);
  } catch {
    return <>{filter}<p role="alert">Rekap izin gagal dimuat. Silakan coba lagi.</p></>;
  }
  const categories = [...new Set([...LEAVE_CATEGORIES, ...allRows.flatMap((row) => Object.keys(row.category_days))])];
  const page = positiveInt(searchParams.unitPage, 1);
  const pageSize = positiveInt(searchParams.unitPageSize, 10);
  const pagedRows = allRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Rekap Izin Pegawai Unit</CardTitle>
            <CardDescription>Tahun Pelajaran {yearName}. Hanya pegawai aktif.</CardDescription>
          </div>
          <DownloadUnitLeaveExcel
            rows={allRows}
            details={details}
            categories={categories}
            yearName={yearName}
            startDate={dates.startDate}
            endDate={dates.endDate}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filter}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No. Pegawai</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Jumlah Hari Izin</TableHead>
              {categories.map((category) => (
                <TableHead key={category} className="min-w-32 max-w-52 whitespace-normal text-right">{category} (hari)</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>{r.employee_no}</TableCell>
                <TableCell>{r.unit_name ?? "-"}</TableCell>
                <TableCell className="text-right">{r.total_leave_days}</TableCell>
                {categories.map((category) => (
                  <TableCell key={category} className="text-right">{Object.hasOwn(r.category_days, category) ? r.category_days[category] : 0}</TableCell>
                ))}
              </TableRow>
            ))}
            {pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4 + categories.length} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataPagination
          basePath="/dashboard/leave-requests"
          searchParams={{ ...searchParams, tab: "unit", leaveStartDate: dates.startDate, leaveEndDate: dates.endDate }}
          pageParam="unitPage"
          pageSizeParam="unitPageSize"
          page={page}
          pageSize={pageSize}
          total={allRows.length}
          itemLabel="pegawai"
        />
      </CardContent>
    </Card>
  );
}

async function ValidationList({ supabase }: { supabase: any }) {
  const { data: rows } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, leave_category, reason, status, admin_note, profiles:profiles!leave_requests_user_id_fkey(full_name), units:units!leave_requests_unit_id_fkey(name), leave_request_attachments(kind, drive_view_link, file_name)")
    .order("created_at", { ascending: false });

  const allRows = rows ?? [];
  const summary = allRows.reduce(
    (acc: Record<string, number>, row: any) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    { total: 0, MENUNGGU: 0, DISETUJUI: 0, DITOLAK: 0, PERLU_REVISI: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ValidationSummaryCard label="Total" value={summary.total} />
        <ValidationSummaryCard label="Menunggu" value={summary.MENUNGGU} />
        <ValidationSummaryCard label="Disetujui" value={summary.DISETUJUI} />
        <ValidationSummaryCard label="Ditolak" value={summary.DITOLAK} />
        <ValidationSummaryCard label="Perlu Revisi" value={summary.PERLU_REVISI} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validasi Pengajuan</CardTitle>
          <CardDescription>Setujui, tolak, atau minta revisi melalui aksi validasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pegawai</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
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
                  <TableCell>
                    {r.start_date}
                    {r.end_date !== r.start_date ? ` s/d ${r.end_date}` : ""}
                  </TableCell>
                  <TableCell>{r.leave_category}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(r.leave_request_attachments ?? []).map((a: any, i: number) => (
                        <a
                          key={i}
                          href={a.drive_view_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          {a.kind === "SS_KEPALA_UNIT" ? "SS Kepala Unit" : "Bukti Izin"}
                        </a>
                      ))}
                      {(r.leave_request_attachments ?? []).length === 0 && "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                        Validasi
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Validasi Izin</DialogTitle>
                          <DialogDescription>
                            {r.profiles?.full_name ?? "-"} · {r.leave_category} · {r.start_date}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-md border bg-muted/30 p-3 text-sm">
                          <p className="font-medium">Keterangan</p>
                          <p className="mt-1 text-muted-foreground">{r.reason}</p>
                        </div>
                        <LeaveReviewForm id={r.id} currentStatus={r.status} currentNote={r.admin_note} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {allRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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


async function Recap({ supabase, yearName, searchParams }: { supabase: any; yearName: string; searchParams: Record<string, string> }) {
  const dates = leaveDateFilter(searchParams);
  const filter = <LeaveDateFilterForm tab="rekap" dates={dates} />;
  if (dates.error) return filter;
  const args = { p_start_date: dates.startDate, p_end_date: dates.endDate };
  const results = await Promise.all([
    supabase.rpc("unit_leave_counts_active_year", args),
    supabase.rpc("leave_recap_by_category_active_year", args),
    supabase.rpc("leave_recap_by_unit_active_year", args),
    supabase.rpc("leave_recap_stats_active_year", args),
  ]);
  if (results.some((result) => result.error)) {
    return <>{filter}<p role="alert">Rekap izin gagal dimuat. Silakan coba lagi.</p></>;
  }
  const [{ data: perEmployee }, { data: byCategory }, { data: byUnit }, { data: statsRows }] = results;
  let details: Record<string, string>[];
  try {
    details = await loadRequestRecapDetails(supabase, "leave_requests", perEmployee ?? [], dates.startDate, dates.endDate);
  } catch {
    return <>{filter}<p role="alert">Detail izin gagal dimuat. Silakan coba lagi.</p></>;
  }
  const stats = (statsRows ?? [])[0] ?? { total_requests: 0, avg_duration_days: null };

  return (
    <div className="space-y-4">
      {filter}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pengajuan Izin (TP {yearName})</CardDescription>
            <CardTitle className="text-3xl">{stats.total_requests ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rata-rata Durasi Izin</CardDescription>
            <CardTitle className="text-3xl">
              {stats.avg_duration_days ?? 0} <span className="text-base font-normal">hari</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Izin per Jenis</CardTitle>
            <CardDescription>Tahun Pelajaran {yearName}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Izin</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(byCategory ?? []).map((r: any) => (
                  <TableRow key={r.leave_category}>
                    <TableCell>{r.leave_category}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                  </TableRow>
                ))}
                {(byCategory ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Izin per Unit</CardTitle>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Izin per Pegawai (Aktif)</CardTitle>
              <CardDescription>Tahun Pelajaran {yearName}. Hanya pegawai berstatus aktif.</CardDescription>
            </div>
            <DownloadLeaveRecapExcel
              details={details}
              perEmployee={(perEmployee ?? []) as any}
              byCategory={(byCategory ?? []) as any}
              byUnit={(byUnit ?? []) as any}
              stats={stats}
              yearName={yearName}
              startDate={dates.startDate}
              endDate={dates.endDate}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Jumlah Izin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(perEmployee ?? []).map((r: any) => (
                <TableRow key={r.user_id}>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell>{r.unit_name ?? "-"}</TableCell>
                  <TableCell className="text-right">{r.total_leaves}</TableCell>
                </TableRow>
              ))}
              {(perEmployee ?? []).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaveDateFilterForm({ tab, dates }: {
  tab: "unit" | "rekap";
  dates: ReturnType<typeof leaveDateFilter>;
}) {
  return (
    <div className="space-y-2">
      <form key={`${tab}-${dates.startDate}-${dates.endDate}`} action="/dashboard/leave-requests" className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input type="hidden" name="tab" value={tab} />
        <div className="space-y-1.5">
          <Label htmlFor="leave-start-date">Tanggal Mulai</Label>
          <Input id="leave-start-date" name="leaveStartDate" type="date" required defaultValue={dates.startDate} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="leave-end-date">Tanggal Selesai</Label>
          <Input id="leave-end-date" name="leaveEndDate" type="date" required defaultValue={dates.endDate} />
        </div>
        <Button type="submit" variant="outline">Terapkan Filter</Button>
        <Link
          href={`/dashboard/leave-requests?tab=${tab}`}
          className={tab === "unit" ? "inline-flex h-10 items-center justify-center rounded-[var(--radius-full)] px-5 text-sm font-medium hover:bg-primary/6 hover:text-primary" : "text-sm text-primary underline underline-offset-4"}
        >
          {tab === "unit" ? "Reset" : "Bulan ini"}
        </Link>
      </form>
      <p className="text-sm text-muted-foreground">
        {tab === "unit" ? `${LEAVE_DAY_DESCRIPTION} Reset kembali ke bulan berjalan.` : "Setiap pengajuan yang masa izinnya bersinggungan dengan periode dihitung satu kali, dalam tahun pelajaran aktif."}
      </p>
      {dates.error && <p role="alert" className="text-sm text-destructive">{dates.error}</p>}
    </div>
  );
}
