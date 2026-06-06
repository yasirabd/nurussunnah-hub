"use client";

import Link from "next/link";
import { Pencil, UserPlus, UserX } from "lucide-react";

import { deactivateEmployeeAction } from "./actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ACTIVE_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  activeStatusBadgeVariant,
} from "@/lib/employee-status";
import { formatDateId, formatLeavePeriod } from "@/lib/employee-leave.mjs";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";

type EmployeeLeavePeriod = { start_date: string; end_date: string; reason?: string | null };
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EmployeeRow = {
  id: string;
  full_name: string;
  employee_no: string;
  email: string;
  phone: string | null;
  gender: "L" | "P";
  marital_status: string | null;
  birth_place: string | null;
  birth_date: string | null;
  last_education: string | null;
  study_program: string | null;
  address_ktp: string | null;
  address_domicile: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  employee_status: EmployeeStatus;
  active_status: ActiveStatus;
  active_status_start_date: string | null;
  active_status_end_date: string | null;
  active_status_note: string | null;
  must_change_password: boolean;
  home_unit_id: string | null;
  units: { id: string; name: string; code: string } | null;
};

type UnitOption = {
  id: string;
  name: string;
  code: string;
};

type EmployeeDirectoryTableProps = {
  rows: EmployeeRow[];
  rolesByUser: Record<string, string[]>;
  positionsByUser: Record<string, string[]>;
  activeLeavesByUser: Record<string, EmployeeLeavePeriod>;
  units: UnitOption[];
  canManageEmployees: boolean;
  canEditPosition: boolean;
};

export function EmployeeDirectoryTable({
  rows,
  rolesByUser,
  positionsByUser,
  activeLeavesByUser,
  canManageEmployees,
  canEditPosition,
}: EmployeeDirectoryTableProps) {
  return (
    <>
      {canManageEmployees && (
        <div className="mb-4 flex justify-end">
          <Link href="/dashboard/employees/new" className={buttonVariants()}>
            <UserPlus className="h-4 w-4" />
            Tambah Pegawai
          </Link>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pegawai</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Jabatan</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tidak ada data pegawai pada filter ini.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row.employee_no}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {row.units ? (
                    <div>
                      <p className="text-sm">{row.units.name}</p>
                      <p className="text-xs text-muted-foreground">{row.units.code}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <PillList values={positionsByUser[row.id] ?? []} fallback="-" />
                </TableCell>
                <TableCell>
                  <PillList values={rolesByUser[row.id] ?? []} fallback="PEGAWAI" />
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-sm">
                    <p className="break-all">{row.email}</p>
                    <p className="text-muted-foreground">{row.phone || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={activeStatusBadgeVariant(row.active_status)} className="w-fit">
                      {ACTIVE_STATUS_LABELS[row.active_status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {EMPLOYEE_STATUS_LABELS[row.employee_status]}
                    </span>
                    {row.active_status === "CUTI" && activeLeavesByUser[row.id] && (
                      <span className="text-xs leading-5 text-muted-foreground">
                        {formatLeavePeriod(activeLeavesByUser[row.id])}
                      </span>
                    )}
                    {row.active_status !== "CUTI" && row.active_status_start_date && (
                      <span className="text-xs leading-5 text-muted-foreground">
                        {formatDateId(row.active_status_start_date)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {(canManageEmployees || canEditPosition) && (
                      <Link
                        href={`/dashboard/employees/${row.id}/edit`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label={`Edit ${row.full_name}`}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    )}
                    {canManageEmployees && <DeactivateDialog employee={row} />}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function DeactivateDialog({ employee }: { employee: EmployeeRow }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" aria-label={`Nonaktifkan ${employee.full_name}`} />}>
        <UserX className="h-4 w-4 text-destructive" />
        <span className="sr-only">Nonaktifkan</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={deactivateEmployeeAction}>
          <input type="hidden" name="id" value={employee.id} />
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan pegawai?</AlertDialogTitle>
            <AlertDialogDescription>
              {employee.full_name} akan ditandai Nonaktif. Riwayat data tetap disimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive">Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PillList({ values, fallback }: { values: string[]; fallback: string }) {
  if (!values.length) return <span className="text-sm text-muted-foreground">{fallback}</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary" className="font-normal">
          {value}
        </Badge>
      ))}
    </div>
  );
}

