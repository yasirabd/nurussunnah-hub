"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

import {
  ACTIVE_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/employee-status";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";

export type EmployeeExportRow = {
  id: string;
  full_name: string;
  employee_no: string;
  email: string;
  phone: string | null;
  gender: "L" | "P";
  employee_status: EmployeeStatus;
  active_status: ActiveStatus;
  units: { name: string; code: string } | null;
};

export function DownloadEmployeesExcel({
  rows,
  rolesByUser,
}: {
  rows: EmployeeExportRow[];
  rolesByUser: Record<string, string[]>;
}) {
  function handleDownload() {
    const employeeRows = rows.map((row) => ({
      "Nama": row.full_name,
      "NIY": row.employee_no,
      "Email": row.email,
      "HP": row.phone || "-",
      "Jenis Kelamin": row.gender === "L" ? "Laki-laki" : "Perempuan",
      "Unit": row.units?.name ?? "-",
      "Kode Unit": row.units?.code ?? "-",
      "Status Aktif": ACTIVE_STATUS_LABELS[row.active_status] ?? row.active_status,
      "Status Pegawai": EMPLOYEE_STATUS_LABELS[row.employee_status] ?? row.employee_status,
      "Role": (rolesByUser[row.id] ?? ["PEGAWAI"]).join(", "),
    }));

    const ws = XLSX.utils.json_to_sheet(employeeRows);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 30 },
      { wch: 18 },
      { wch: 16 }, // Jenis Kelamin
      { wch: 24 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
    XLSX.writeFile(wb, `direktori-pegawai-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={rows.length === 0}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      Export Excel
    </button>
  );
}
