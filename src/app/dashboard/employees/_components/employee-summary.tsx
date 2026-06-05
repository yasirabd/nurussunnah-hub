import { Badge } from "@/components/ui/badge";
import { ACTIVE_STATUS_LABELS, EMPLOYEE_STATUS_LABELS, activeStatusBadgeVariant } from "@/lib/employee-status";
import type { ActiveStatus, EmployeeStatus } from "@/types/database";

export type EmployeeSummaryValue = {
  full_name: string;
  employee_no: string;
  employee_status: EmployeeStatus;
  active_status: ActiveStatus;
  units: { name: string; code: string } | null;
};

export function EmployeeSummary({ employee, roles }: { employee: EmployeeSummaryValue; roles: string[] }) {
  return (
    <section className="rounded-[var(--radius-lg)] border bg-card p-5 elevation-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Edit Pegawai</p>
          <h1 className="truncate text-2xl font-semibold tracking-normal">{employee.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            NIY {employee.employee_no} - {employee.units ? `${employee.units.code} ${employee.units.name}` : "Tanpa unit"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          <Badge variant={activeStatusBadgeVariant(employee.active_status)}>
            {ACTIVE_STATUS_LABELS[employee.active_status]}
          </Badge>
          <Badge variant="outline">{EMPLOYEE_STATUS_LABELS[employee.employee_status]}</Badge>
          {roles.map((role) => (
            <Badge key={role} variant="secondary">{role}</Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

