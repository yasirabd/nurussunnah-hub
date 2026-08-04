"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UnitOption = { id: string; name: string; code: string };

type DirectoryFilterFormProps = {
  q: string;
  unitId: string;
  active: string;
  pageSize: number;
  units: UnitOption[];
  canManageEmployees: boolean;
  canFilterInactive: boolean;
};

export function DirectoryFilterForm({
  q,
  unitId,
  active,
  pageSize,
  units,
  canManageEmployees,
  canFilterInactive,
}: DirectoryFilterFormProps) {
  return (
    <form className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={pageSize} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} className="pl-9" placeholder="Cari pegawai" />
      </div>
      <select
        name="unit"
        defaultValue={unitId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm"
      >
        {canManageEmployees && <option value="">Semua unit</option>}
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.code} - {unit.name}
          </option>
        ))}
      </select>
      <select
        name="active"
        defaultValue={active}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm"
      >
        <option value="active">Aktif</option>
        {canFilterInactive && <option value="inactive">Non-aktif</option>}
        {canFilterInactive && <option value="all">Semua status</option>}
      </select>
      <Button type="submit">Terapkan</Button>
    </form>
  );
}
