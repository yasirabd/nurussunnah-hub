"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

export type LeaveRecapRow = {
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  total_leaves: number;
};

type LeaveCategoryRow = {
  leave_category: string;
  total: number;
};

type LeaveUnitRow = {
  unit_name: string;
  total: number;
};

type LeaveStats = {
  total_requests: number;
  avg_duration_days: number | null;
};

export function DownloadLeaveRecapExcel({
  perEmployee,
  byCategory,
  byUnit,
  stats,
  yearName,
}: {
  perEmployee: LeaveRecapRow[];
  byCategory: LeaveCategoryRow[];
  byUnit: LeaveUnitRow[];
  stats: LeaveStats;
  yearName: string;
}) {
  function handleDownload() {
    const employeeRows = perEmployee.map((r) => ({
      Nama: r.full_name,
      "No. Pegawai": r.employee_no,
      Unit: r.unit_name ?? "-",
      "Jumlah Izin": Number(r.total_leaves),
    }));

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        "Tahun Pelajaran": yearName,
        "Total Pengajuan": Number(stats.total_requests ?? 0),
        "Rata-rata Durasi (hari)": Number(stats.avg_duration_days ?? 0),
      },
    ]);
    const categorySheet = XLSX.utils.json_to_sheet(
      byCategory.map((r) => ({
        "Jenis Izin": r.leave_category,
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

    summarySheet["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 24 }];
    categorySheet["!cols"] = [{ wch: 40 }, { wch: 12 }];
    unitSheet["!cols"] = [{ wch: 24 }, { wch: 12 }];
    employeeSheet["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, categorySheet, "Per Jenis");
    XLSX.utils.book_append_sheet(wb, unitSheet, "Per Unit");
    XLSX.utils.book_append_sheet(wb, employeeSheet, "Per Pegawai");
    XLSX.writeFile(wb, `rekap-izin-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={perEmployee.length === 0 && byCategory.length === 0 && byUnit.length === 0}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      Export Excel
    </button>
  );
}
