"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_STATUS_OPTIONS, EMPLOYEE_STATUS_OPTIONS } from "@/lib/employee-status";

export type EmployeeFormValue = {
  full_name?: string | null;
  employee_no?: string | null;
  nik?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: "L" | "P" | null;
  marital_status?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  last_education?: string | null;
  study_program?: string | null;
  address_ktp?: string | null;
  address_domicile?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  employee_status?: string | null;
  active_status?: string | null;
  active_status_start_date?: string | null;
  active_status_end_date?: string | null;
  active_status_note?: string | null;
  home_unit_id?: string | null;
  emergency_name?: string | null;
  emergency_relation?: string | null;
  emergency_phone?: string | null;
  uniform_size?: string | null;
  ktp_url?: string | null;
  photo_url?: string | null;
};

export type EmployeeLeaveFormValue = {
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
};

export type UnitOption = {
  id: string;
  name: string;
  code: string;
};

const roleOptions = ["PEGAWAI", "KEPALA_UNIT", "HRD", "ADMIN"] as const;

export function EmployeeFormFields({
  employee,
  activeLeave,
  units,
  showDefaultPasswordHelp = false,
}: {
  employee?: EmployeeFormValue | null;
  activeLeave?: EmployeeLeaveFormValue | null;
  units: UnitOption[];
  showDefaultPasswordHelp?: boolean;
}) {
  const [activeStatus, setActiveStatus] = useState(employee?.active_status ?? "AKTIF");

  return (
    <>
      <FormSection title="Akun & Kepegawaian">
        <Field label="Nama Lengkap" name="full_name" defaultValue={employee?.full_name} required />
        <Field
          label="NIY"
          name="employee_no"
          defaultValue={employee?.employee_no}
          helper="Spasi akan dihapus dan huruf dibuat kapital."
          required
        />
        <Field label="NIK (KTP)" name="nik" defaultValue={employee?.nik} inputMode="numeric" maxLength={16} helper="16 digit sesuai KTP." />
        <Field label="Email" name="email" type="email" defaultValue={employee?.email} required />
        <Field label="No. HP" name="phone" defaultValue={employee?.phone} />
        <SelectField label="Unit Home" name="home_unit_id" defaultValue={employee?.home_unit_id ?? ""}>
          <option value="">Pilih unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.code} - {unit.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status Pegawai" name="employee_status" defaultValue={employee?.employee_status ?? "CPTY"}>
          {EMPLOYEE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status Aktif"
          name="active_status"
          defaultValue={employee?.active_status ?? "AKTIF"}
          helper="Status ini menentukan apakah pegawai dihitung sebagai pegawai aktif sistem."
          onChange={(event) => setActiveStatus(event.currentTarget.value)}
        >
          {ACTIVE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <StatusDetailFields employee={employee} activeLeave={activeLeave} activeStatus={activeStatus} />
        {showDefaultPasswordHelp && (
          <p className="rounded-[var(--radius-md)] bg-primary/10 p-3 text-sm text-primary md:col-span-2">
            Password awal pegawai baru adalah bismillahns dan wajib diganti saat login pertama.
          </p>
        )}
      </FormSection>

      <FormSection title="Data Pribadi">
        <SelectField label="Jenis Kelamin" name="gender" defaultValue={employee?.gender ?? "L"}>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </SelectField>
        <SelectField label="Status Perkawinan" name="marital_status" defaultValue={employee?.marital_status ?? ""}>
          <option value="">Pilih status</option>
          <option value="Belum Kawin">Belum Kawin</option>
          <option value="Kawin">Kawin</option>
          <option value="Cerai Mati">Cerai Mati</option>
          <option value="Cerai Hidup">Cerai Hidup</option>
        </SelectField>
        <Field label="Tempat Lahir" name="birth_place" defaultValue={employee?.birth_place} />
        <Field label="Tanggal Lahir" name="birth_date" type="date" defaultValue={employee?.birth_date} />
        <SelectField label="Pendidikan Terakhir" name="last_education" defaultValue={employee?.last_education ?? ""}>
          <option value="">Pilih pendidikan</option>
          <option value="SD/Sederajat">SD/Sederajat</option>
          <option value="SMP/Sederajat">SMP/Sederajat</option>
          <option value="SMA/Sederajat">SMA/Sederajat</option>
          <option value="D3">D3</option>
          <option value="S1">S1</option>
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

      <FormSection title="Kontak Darurat & Seragam">
        <Field label="Nama Kontak Darurat" name="emergency_name" defaultValue={employee?.emergency_name} />
        <Field label="Hubungan" name="emergency_relation" placeholder="Contoh: Orang tua, Pasangan" defaultValue={employee?.emergency_relation} />
        <Field label="No. HP Kontak Darurat" name="emergency_phone" type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" defaultValue={employee?.emergency_phone} />
        <SelectField label="Ukuran Seragam" name="uniform_size" defaultValue={employee?.uniform_size ?? ""}>
          <option value="">Pilih ukuran</option>
          {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </SelectField>
        <DocRow label="Scan / Foto KTP" href={employee?.ktp_url} />
        <DocRow label="Pas Foto" href={employee?.photo_url} />
      </FormSection>
    </>
  );
}

function StatusDetailFields({
  employee,
  activeLeave,
  activeStatus,
}: {
  employee?: EmployeeFormValue | null;
  activeLeave?: EmployeeLeaveFormValue | null;
  activeStatus: string;
}) {
  if (activeStatus === "CUTI") {
    return (
      <div className="space-y-4 rounded-[var(--radius-md)] border bg-background p-4 md:col-span-2">
        <div>
          <h3 className="text-sm font-semibold tracking-normal">Detail Status</h3>
          <p className="text-xs leading-5 text-muted-foreground">Cuti memerlukan tanggal mulai dan tanggal selesai.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tanggal Mulai Cuti" name="leave_start_date" type="date" defaultValue={activeLeave?.start_date ?? employee?.active_status_start_date} required />
          <Field label="Tanggal Selesai Cuti" name="leave_end_date" type="date" defaultValue={activeLeave?.end_date ?? employee?.active_status_end_date} required />
          <TextareaField label="Catatan Cuti" name="leave_reason" defaultValue={activeLeave?.reason ?? employee?.active_status_note} />
        </div>
      </div>
    );
  }

  if (activeStatus === "DIBERHENTIKAN") {
    return <FinalStatusFields title="Diberhentikan" dateLabel="Tanggal Diberhentikan" helper="Status ini mengeluarkan pegawai dari pegawai aktif sistem." employee={employee} />;
  }

  if (activeStatus === "RESIGN") {
    return <FinalStatusFields title="Resign" dateLabel="Tanggal Resign" helper="Status ini mengeluarkan pegawai dari pegawai aktif sistem." employee={employee} />;
  }

  if (activeStatus === "PENSIUN") {
    return <FinalStatusFields title="Pensiun" dateLabel="Tanggal Mulai Pensiun" helper="Status ini mengeluarkan pegawai dari pegawai aktif sistem." employee={employee} />;
  }

  if (activeStatus === "NONAKTIF") {
    return (
      <div className="space-y-4 rounded-[var(--radius-md)] border bg-background p-4 md:col-span-2">
        <div>
          <h3 className="text-sm font-semibold tracking-normal">Detail Status</h3>
          <p className="text-xs leading-5 text-muted-foreground">Catatan nonaktif bersifat administratif.</p>
        </div>
        <TextareaField label="Catatan" name="status_note" defaultValue={employee?.active_status_note} />
      </div>
    );
  }

  return null;
}

function FinalStatusFields({
  title,
  dateLabel,
  helper,
  employee,
}: {
  title: string;
  dateLabel: string;
  helper: string;
  employee?: EmployeeFormValue | null;
}) {
  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border bg-background p-4 md:col-span-2">
      <div>
        <h3 className="text-sm font-semibold tracking-normal">Detail Status: {title}</h3>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={dateLabel} name="status_effective_date" type="date" defaultValue={employee?.active_status_start_date} required />
        <TextareaField label="Catatan" name="status_note" defaultValue={employee?.active_status_note} />
      </div>
    </div>
  );
}

export function RoleCheckboxes({ roles }: { roles: string[] }) {
  return (
    <FormSection title="Role">
      <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
        {roleOptions.map((role) => (
          <CheckboxField key={role} label={role} name={role} defaultChecked={roles.includes(role)} />
        ))}
      </div>
    </FormSection>
  );
}

export function PositionField({ positionName }: { positionName?: string | null }) {
  return (
    <FormSection title="Jabatan">
      <Field
        label="Jabatan Aktif"
        name="position_name"
        defaultValue={positionName}
        placeholder="Contoh: Kepala Unit, Guru Matematika"
        helper="Isi jabatan aktif yang sedang berlaku."
      />
    </FormSection>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

type NullableInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue"> & {
  label: string;
  helper?: string;
  defaultValue?: string | number | readonly string[] | null;
};

type NullableTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue"> & {
  label: string;
  helper?: string;
  defaultValue?: string | number | readonly string[] | null;
};

function DocRow({ label, href }: { label: string; href?: string | null }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex h-10 items-center rounded-[var(--radius-sm)] border border-input bg-secondary/40 px-3 text-sm">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Lihat dokumen
          </a>
        ) : (
          <span className="text-muted-foreground">Belum diunggah</span>
        )}
      </div>
    </div>
  );
}
function Field({ label, helper, defaultValue, ...props }: NullableInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={props.id ?? props.name}>{label}</label>
      <Input id={props.id ?? props.name} defaultValue={defaultValue ?? ""} {...props} />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function TextareaField({ label, helper, defaultValue, ...props }: NullableTextareaProps) {
  return (
    <div className="space-y-1.5 md:col-span-2">
      <label className="text-sm font-medium" htmlFor={props.id ?? props.name}>{label}</label>
      <Textarea id={props.id ?? props.name} defaultValue={defaultValue ?? ""} className="min-h-28" {...props} />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function SelectField({
  label,
  helper,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={props.id ?? props.name}>{label}</label>
      <select
        id={props.id ?? props.name}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {children}
      </select>
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function CheckboxField({
  label,
  helper,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5 rounded-[var(--radius-sm)] border bg-background p-3">
      <div className="flex items-center gap-2">
        <input id={props.id ?? props.name} type="checkbox" className="h-4 w-4" {...props} />
        <label className="text-sm font-medium" htmlFor={props.id ?? props.name}>{label}</label>
      </div>
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}
