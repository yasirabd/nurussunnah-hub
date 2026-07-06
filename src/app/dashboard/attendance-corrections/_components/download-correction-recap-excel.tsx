"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { correctionRecapSheetNames } from "@/lib/attendance-correction-recap.mjs";

export type CorrectionRecapRow = {
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  total_correction_days: number;
  lupa_tap_days: number;
  kartu_tertinggal_days: number;
  kartu_hilang_rusak_days: number;
  kendala_sistem_days: number;
};

type CorrectionKindRow = {
  correction_kind: string;
  total: number;
};

type CorrectionUnitRow = {
  unit_name: string;
  total: number;
};

type CorrectionStats = {
  total_requests: number;
  distinct_employees: number;
};

const KIND_LABEL: Record<string, string> = {
  LUPA_TAP: "Lupa Tap Kartu",
  KARTU_TERTINGGAL: "Kartu Tertinggal",
  KARTU_HILANG_RUSAK: "Kartu Hilang/Rusak",
  KENDALA_SISTEM: "Kendala Sistem",
};

export function DownloadCorrectionRecapExcel({
  perEmployee,
  byKind,
  byUnit,
  stats,
  yearName,
  dateRange,
  includeKindAndUnitSheets = true,
}: {
  perEmployee: CorrectionRecapRow[];
  byKind: CorrectionKindRow[];
  byUnit: CorrectionUnitRow[];
  stats: CorrectionStats;
  yearName: string;
  dateRange?: { startDate?: string; endDate?: string };
  includeKindAndUnitSheets?: boolean;
}) {
  function handleDownload() {
    const employeeRows = perEmployee.map((r) => ({
      Nama: r.full_name,
      "No. Pegawai": r.employee_no,
      Unit: r.unit_name ?? "-",
      "Hari Dikoreksi": Number(r.total_correction_days),
      "Lupa Tap": Number(r.lupa_tap_days),
      "Kartu Tertinggal": Number(r.kartu_tertinggal_days),
      "Kartu Hilang/Rusak": Number(r.kartu_hilang_rusak_days),
      "Kendala Sistem": Number(r.kendala_sistem_days),
    }));

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        "Tahun Pelajaran": yearName,
        "Tanggal Mulai": dateRange?.startDate || "-",
        "Tanggal Selesai": dateRange?.endDate || "-",
        "Total Pengajuan": Number(stats.total_requests ?? 0),
        "Pegawai Mengajukan": Number(stats.distinct_employees ?? 0),
      },
    ]);
    const kindSheet = XLSX.utils.json_to_sheet(
      byKind.map((r) => ({
        "Jenis Koreksi": KIND_LABEL[r.correction_kind] ?? r.correction_kind,
        Jumlah: Number(r.total),
      }))
    );
    const unitSheet = XLSX.utils.json_to_sheet(
      byUnit.map((r) => ({
        Unit: r.unit_name ?? "-",
        Jumlah: Number(r.total),
      }))
    );
    const employeeSheet = XLSX.utils.json_to_sheet(employeeRows);

    summarySheet["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 20 }];
    kindSheet["!cols"] = [{ wch: 30 }, { wch: 12 }];
    unitSheet["!cols"] = [{ wch: 24 }, { wch: 12 }];
    employeeSheet["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    for (const sheetName of correctionRecapSheetNames(includeKindAndUnitSheets)) {
      if (sheetName === "Ringkasan") XLSX.utils.book_append_sheet(wb, summarySheet, sheetName);
      if (sheetName === "Per Jenis") XLSX.utils.book_append_sheet(wb, kindSheet, sheetName);
      if (sheetName === "Per Unit") XLSX.utils.book_append_sheet(wb, unitSheet, sheetName);
      if (sheetName === "Per Pegawai") XLSX.utils.book_append_sheet(wb, employeeSheet, sheetName);
    }
    XLSX.writeFile(wb, `rekap-koreksi-presensi-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={perEmployee.length === 0 && byKind.length === 0 && byUnit.length === 0}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      Export Excel
    </button>
  );
}
