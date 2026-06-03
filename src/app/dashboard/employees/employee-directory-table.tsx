"use client";

import { useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";

import {
  createEmployeeAction,
  deactivateEmployeeAction,
  updateEmployeeCurrentPositionAction,
  updateEmployeeProfileAction,
  updateEmployeeRolesAction,
} from "./actions";
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
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
  employee_status: string;
  is_active: boolean;
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
  units: UnitOption[];
  canManageEmployees: boolean;
  canEditPosition: boolean;
};

const roleOptions = ["PEGAWAI", "KEPALA_UNIT", "HRD", "ADMIN"] as const;

export function EmployeeDirectoryTable({
  rows,
  rolesByUser,
  positionsByUser,
  units,
  canManageEmployees,
  canEditPosition,
}: EmployeeDirectoryTableProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("edit");

  const isCreate = mode === "create";

  function openCreate() {
    setSelectedEmployee(null);
    setMode("create");
    setDrawerOpen(true);
  }

  function openEdit(row: EmployeeRow) {
    setSelectedEmployee(row);
    setMode("edit");
    setDrawerOpen(true);
  }

  return (
    <>
      {canManageEmployees && (
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Tambah Pegawai
          </Button>
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
                    <Badge variant={row.is_active ? "default" : "secondary"} className="w-fit">
                      {row.is_active ? "Aktif" : "Non-aktif"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {statusLabel(row.employee_status)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {(canManageEmployees || canEditPosition) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${row.full_name}`}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                    {canManageEmployees && (
                      <DeactivateDialog employee={row} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="sm:max-w-3xl">
          <DrawerHeader>
            <DrawerTitle>{isCreate ? "Tambah Pegawai" : selectedEmployee?.full_name}</DrawerTitle>
            <DrawerDescription>
              {isCreate
                ? "Buat akun login, profil, role, unit, dan jabatan awal."
                : `NIY: ${selectedEmployee?.employee_no} - Unit: ${selectedEmployee?.units?.name || "-"} - Status: ${selectedEmployee?.is_active ? "Aktif" : "Non-aktif"}`}
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {isCreate && canManageEmployees ? (
              <CreateEmployeeForm units={units} />
            ) : selectedEmployee ? (
              <EditEmployeeTabs
                employee={selectedEmployee}
                roles={rolesByUser[selectedEmployee.id] ?? []}
                positionName={positionsByUser[selectedEmployee.id]?.[0] ?? ""}
                units={units}
                canManageEmployees={canManageEmployees}
              />
            ) : null}
          </div>

          <DrawerFooter className="border-t bg-popover">
            <DrawerClose asChild>
              <Button variant="outline">Tutup</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function CreateEmployeeForm({ units }: { units: UnitOption[] }) {
  return (
    <form action={createEmployeeAction} className="space-y-5">
      <ProfileSections units={units} />
      <FormSection title="Role Awal">
        <RoleCheckboxes roles={["PEGAWAI"]} />
      </FormSection>
      <FormSection title="Jabatan Awal">
        <Field label="Jabatan Aktif" name="position_name" placeholder="Contoh: Guru Matematika" />
      </FormSection>
      <div className="sticky bottom-0 -mx-4 border-t bg-popover px-4 py-3">
        <Button type="submit" className="w-full">Tambah Pegawai</Button>
      </div>
    </form>
  );
}

function EditEmployeeTabs({
  employee,
  roles,
  positionName,
  units,
  canManageEmployees,
}: {
  employee: EmployeeRow;
  roles: string[];
  positionName: string;
  units: UnitOption[];
  canManageEmployees: boolean;
}) {
  if (!canManageEmployees) {
    return <PositionForm employee={employee} positionName={positionName} />;
  }

  return (
    <Tabs defaultValue="profil" className="gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="role">Role</TabsTrigger>
        <TabsTrigger value="jabatan">Jabatan</TabsTrigger>
      </TabsList>
      <TabsContent value="profil">
        <form action={updateEmployeeProfileAction} className="space-y-5">
          <input type="hidden" name="id" value={employee.id} />
          <ProfileSections employee={employee} units={units} />
          <Button type="submit" className="w-full">Simpan Profil</Button>
        </form>
      </TabsContent>
      <TabsContent value="role">
        <form action={updateEmployeeRolesAction} className="space-y-5">
          <input type="hidden" name="user_id" value={employee.id} />
          <FormSection title="Role Pegawai">
            <RoleCheckboxes roles={roles} />
          </FormSection>
          <Button type="submit" className="w-full">Simpan Role</Button>
        </form>
      </TabsContent>
      <TabsContent value="jabatan">
        <PositionForm employee={employee} positionName={positionName} />
      </TabsContent>
    </Tabs>
  );
}

function ProfileSections({ employee, units }: { employee?: EmployeeRow; units: UnitOption[] }) {
  return (
    <>
      <FormSection title="Akun & Kepegawaian">
        <Field label="Nama Lengkap" name="full_name" defaultValue={employee?.full_name} required />
        <Field label="NIY" name="employee_no" defaultValue={employee?.employee_no} required />
        <Field label="Email" name="email" type="email" defaultValue={employee?.email} required />
        <Field label="No. HP" name="phone" defaultValue={employee?.phone} />
        <SelectField label="Unit Home" name="home_unit_id" defaultValue={employee?.home_unit_id ?? ""}>
          <option value="">Tanpa unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
          ))}
        </SelectField>
        <SelectField label="Status Pegawai" name="employee_status" defaultValue={employee?.employee_status ?? "TETAP"}>
          <option value="TETAP">Tetap</option>
          <option value="TIDAK_TETAP">Tidak Tetap</option>
          <option value="KONTRAK">Kontrak</option>
          <option value="HONORER">Honorer</option>
          <option value="PENSIUN">Pensiun</option>
        </SelectField>
        <CheckboxField label="Pegawai Aktif" name="is_active" defaultChecked={employee?.is_active ?? true} />
      </FormSection>

      <FormSection title="Data Pribadi">
        <SelectField label="Jenis Kelamin" name="gender" defaultValue={employee?.gender ?? "L"}>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </SelectField>
        <SelectField label="Status Perkawinan" name="marital_status" defaultValue={employee?.marital_status ?? ""}>
          <option value="">Pilih status</option>
          <option value="Sudah Kawin">Sudah Kawin</option>
          <option value="Belum Kawin">Belum Kawin</option>
          <option value="Cerai">Cerai</option>
        </SelectField>
        <Field label="Tempat Lahir" name="birth_place" defaultValue={employee?.birth_place} />
        <Field label="Tanggal Lahir" name="birth_date" type="date" defaultValue={employee?.birth_date} />
        <SelectField label="Pendidikan Terakhir" name="last_education" defaultValue={employee?.last_education ?? ""}>
          <option value="">Pilih pendidikan</option>
          <option value="SD/Sederajat">SD/Sederajat</option>
          <option value="SMP/Sederajat">SMP/Sederajat</option>
          <option value="SMA/SMK/Sederajat">SMA/SMK/Sederajat</option>
          <option value="D1/D2/D3">D1/D2/D3</option>
          <option value="D4/S1">D4/S1</option>
          <option value="S2">S2</option>
          <option value="S3">S3</option>
        </SelectField>
        <Field label="Program Studi" name="study_program" defaultValue={employee?.study_program} />
      </FormSection>

      <FormSection title="Kontak & Alamat">
        <Field label="Facebook" name="facebook" defaultValue={employee?.facebook} />
        <Field label="Instagram" name="instagram" defaultValue={employee?.instagram} />
        <Field label="Twitter" name="twitter" defaultValue={employee?.twitter} />
        <TextareaField label="Alamat KTP" name="address_ktp" defaultValue={employee?.address_ktp} />
        <TextareaField label="Alamat Domisili" name="address_domicile" defaultValue={employee?.address_domicile} />
      </FormSection>
    </>
  );
}

function PositionForm({ employee, positionName }: { employee: EmployeeRow; positionName: string }) {
  return (
    <form action={updateEmployeeCurrentPositionAction} className="space-y-5">
      <input type="hidden" name="user_id" value={employee.id} />
      <FormSection title="Jabatan Aktif">
        <Field
          label="Jabatan Aktif"
          name="position_name"
          defaultValue={positionName}
          placeholder="Contoh: Kepala Unit, Guru Matematika"
          required
        />
      </FormSection>
      <Button type="submit" className="w-full">Simpan Jabatan</Button>
    </form>
  );
}

function DeactivateDialog({ employee }: { employee: EmployeeRow }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" aria-label={`Nonaktifkan ${employee.full_name}`} />}>
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">Nonaktifkan</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={deactivateEmployeeAction}>
          <input type="hidden" name="id" value={employee.id} />
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan pegawai?</AlertDialogTitle>
            <AlertDialogDescription>
              {employee.full_name} akan ditandai non-aktif dan Pensiun. Riwayat data tetap disimpan.
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type NullableInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue"> & {
  label: string;
  defaultValue?: string | number | readonly string[] | null;
};

type NullableTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue"> & {
  label: string;
  defaultValue?: string | number | readonly string[] | null;
};

function Field({ label, defaultValue, ...props }: NullableInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={props.id ?? props.name}>{label}</label>
      <Input id={props.id ?? props.name} defaultValue={defaultValue ?? ""} {...props} />
    </div>
  );
}

function TextareaField({ label, defaultValue, ...props }: NullableTextareaProps) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={props.id ?? props.name}>{label}</label>
      <Textarea id={props.id ?? props.name} defaultValue={defaultValue ?? ""} className="min-h-24" {...props} />
    </div>
  );
}

function SelectField({ label, className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <label className="text-xs font-medium text-muted-foreground" htmlFor={props.id ?? props.name}>{label}</label>
      <select
        id={props.id ?? props.name}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function CheckboxField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex items-center gap-2 self-end rounded-[var(--radius-sm)] border bg-background px-3 py-2">
      <input id={props.id ?? props.name} type="checkbox" className="h-4 w-4" {...props} />
      <label className="text-sm font-medium" htmlFor={props.id ?? props.name}>{label}</label>
    </div>
  );
}

function RoleCheckboxes({ roles }: { roles: string[] }) {
  return (
    <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
      {roleOptions.map((role) => (
        <CheckboxField key={role} label={role} name={role} defaultChecked={roles.includes(role)} />
      ))}
    </div>
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
