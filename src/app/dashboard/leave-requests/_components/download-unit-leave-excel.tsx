"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { LEAVE_DAY_DESCRIPTION, unitLeaveExcelRows } from "@/lib/unit-leave-recap.mjs";

export type UnitLeaveRow = {
  user_id: string;
  full_name: string;
  employee_no: string;
  unit_name: string | null;
  total_leave_days: number;
  category_days: Record<string, number>;
};

export function DownloadUnitLeaveExcel({ rows, categories, yearName, startDate, endDate }: {
  rows: UnitLeaveRow[];
  categories: string[];
  yearName: string;
  startDate: string;
  endDate: string;
}) {
  function handleDownload() {
    const workbook = XLSX.utils.book_new();
    const summary = XLSX.utils.json_to_sheet([{
      "Tahun Pelajaran": yearName,
      "Tanggal Mulai": startDate,
      "Tanggal Selesai": endDate,
      "Jumlah Hari Izin": rows.reduce((sum, row) => sum + row.total_leave_days, 0),
      "Pegawai Mengajukan": rows.filter((row) => row.total_leave_days > 0).length,
      "Aturan Perhitungan": LEAVE_DAY_DESCRIPTION,
    }]);
    const employees = XLSX.utils.json_to_sheet(unitLeaveExcelRows(rows, categories));
    summary["!cols"] = [18, 18, 18, 20, 22, 90].map((wch) => ({ wch }));
    employees["!cols"] = [30, 16, 20, 20, ...categories.map((category) => category.length + 7)].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, summary, "Ringkasan");
    XLSX.utils.book_append_sheet(workbook, employees, "Per Pegawai");
    XLSX.writeFile(workbook, `rekap-izin-unit-${startDate}-${endDate}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={rows.length === 0}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      Export Excel
    </button>
  );
}
