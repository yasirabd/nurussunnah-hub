"use client";

import { useState } from "react";
import {
  updateEmployeeProfileAction,
  updateEmployeeRolesAction,
  updateEmployeeCurrentPositionAction,
} from "./actions";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

type EmployeeRow = {
  id: string;
  full_name: string;
  employee_no: string;
  email: string;
  phone: string | null;
  employee_status: string;
  is_active: boolean;
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
  rolesByUser: Map<string, string[]>;
  positionsByUser: Map<string, string[]>;
  units: UnitOption[];
  canManageEmployees: boolean;
};

export function EmployeeDirectoryTable({
  rows,
  rolesByUser,
  positionsByUser,
  units,
  canManageEmployees,
}: EmployeeDirectoryTableProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
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
                Tidak ada data pegawai.
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
                  <PillList values={positionsByUser.get(row.id) ?? []} fallback="-" />
                </TableCell>
                <TableCell>
                  <PillList values={rolesByUser.get(row.id) ?? []} fallback="PEGAWAI" />
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-sm">
                    <p>{row.email}</p>
                    <p className="text-muted-foreground">{row.phone || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={row.is_active ? "default" : "secondary"} className="w-fit">
                      {row.is_active ? "Aktif" : "Non-aktif"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {statusLabel(row.employee_status)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {canManageEmployees && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(row);
                        setDrawerOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedEmployee?.full_name}
            </DrawerTitle>
            <DrawerDescription>
              NIY: {selectedEmployee?.employee_no} • Unit: {selectedEmployee?.units?.name || "-"} • Status: {selectedEmployee?.is_active ? "Aktif" : "Non-aktif"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <Tabs defaultValue="profil">
              <TabsList>
                <TabsTrigger value="profil">Profil</TabsTrigger>
                <TabsTrigger value="role">Role</TabsTrigger>
                <TabsTrigger value="jabatan">Jabatan</TabsTrigger>
              </TabsList>
              <TabsContent value="profil" className="space-y-4 py-4">
  {selectedEmployee && (
    <form action={updateEmployeeProfileAction} className="space-y-4">
      <input type="hidden" name="id" value={selectedEmployee.id} />
      
      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium">
          Nama Lengkap
        </label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={selectedEmployee.full_name}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="employee_no" className="text-sm font-medium">
          NIY
        </label>
        <Input
          id="employee_no"
          name="employee_no"
          defaultValue={selectedEmployee.employee_no}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={selectedEmployee.email}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          No. HP
        </label>
        <Input
          id="phone"
          name="phone"
          defaultValue={selectedEmployee.phone ?? ""}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="employee_status" className="text-sm font-medium">
          Status Pegawai
        </label>
        <select
          id="employee_status"
          name="employee_status"
          defaultValue={selectedEmployee.employee_status}
          className="flex h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="TETAP">Tetap</option>
          <option value="TIDAK_TETAP">Tidak Tetap</option>
          <option value="KONTRAK">Kontrak</option>
          <option value="HONORER">Honorer</option>
          <option value="PENSIUN">Pensiun</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="home_unit_id" className="text-sm font-medium">
          Unit Home
        </label>
        <select
          id="home_unit_id"
          name="home_unit_id"
          defaultValue={selectedEmployee.home_unit_id ?? ""}
          className="flex h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tanpa unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.code} - {unit.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          defaultChecked={selectedEmployee.is_active}
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Pegawai Aktif
        </label>
      </div>

      <Button type="submit" className="w-full">
        Simpan Profil
      </Button>
    </form>
  )}
</TabsContent>
              <TabsContent value="role">
                <p className="text-sm text-muted-foreground">Role form placeholder</p>
              </TabsContent>
              <TabsContent value="jabatan">
                <p className="text-sm text-muted-foreground">Jabatan form placeholder</p>
              </TabsContent>
            </Tabs>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Tutup</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    TETAP: "Tetap",
    TIDAK_TETAP: "Tidak Tetap",
    KONTRAK: "Kontrak",
    HONORER: "Honorer",
    PENSIUN: "Pensiun",
  };
  return labels[status] ?? status;
}
