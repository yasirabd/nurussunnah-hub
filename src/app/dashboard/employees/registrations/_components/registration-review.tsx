"use client";

import { useState } from "react";
import {
  BookOpen,
  Briefcase,
  Check,
  FileText,
  IdCard,
  MapPin,
  Phone,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EDUCATION_LEVELS } from "@/lib/education.mjs";
import { EMPLOYEE_STATUS_OPTIONS } from "@/lib/employee-status";
import { toTitleCaseName } from "@/lib/registration-review.mjs";
import { approveRegistrationAction, rejectRegistrationAction } from "../actions";

export type RegistrationDetail = {
  id: string;
  full_name: string;
  email: string;
  nik: string | null;
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
  home_unit_id: string | null;
  position_name: string | null;
  uniform_size: string | null;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  ktp_url: string | null;
  photo_url: string | null;
  note: string | null;
};

export type RegistrationUnitOption = {
  id: string;
  name: string;
  code: string;
};

const selectClassName =
  "h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Group({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border bg-secondary/20 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  regId,
  label,
  name,
  defaultValue,
  required = false,
  ...props
}: {
  regId: string;
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name" | "required">) {
  const id = `${name}_${regId}`;
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <Input id={id} name={name} defaultValue={defaultValue ?? ""} required={required} {...props} />
    </div>
  );
}

function SelectField({
  regId,
  label,
  name,
  defaultValue,
  required = false,
  children,
}: {
  regId: string;
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const id = `${name}_${regId}`;
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={selectClassName}
      >
        {children}
      </select>
    </div>
  );
}

function TextareaField({
  regId,
  label,
  name,
  defaultValue,
  required = false,
}: {
  regId: string;
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const id = `${name}_${regId}`;
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <Textarea id={id} name={name} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}

export function RegistrationReview({
  reg,
  units,
}: {
  reg: RegistrationDetail;
  units: RegistrationUnitOption[];
}) {
  const [fullName, setFullName] = useState(reg.full_name);

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Tinjau</DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="h-6 w-6 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate">{fullName}</DialogTitle>
              <DialogDescription className="truncate">{reg.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form action={approveRegistrationAction} className="space-y-4">
          <input type="hidden" name="id" value={reg.id} />

          <Group icon={UserRound} title="Data Diri">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor={`full_name_${reg.id}`}>
                Nama Lengkap <span className="text-destructive">*</span>
              </label>
              <Input
                id={`full_name_${reg.id}`}
                name="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.currentTarget.value)}
                onBlur={(event) => setFullName(toTitleCaseName(event.currentTarget.value))}
                required
              />
              <p className="text-xs text-muted-foreground">Otomatis diubah ke Title Case saat kolom ditinggalkan.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Email</span>
              <div className="flex h-10 items-center rounded-[var(--radius-sm)] border bg-muted/40 px-3 text-sm">
                {reg.email}
              </div>
              <p className="text-xs text-muted-foreground">Email pendaftaran tidak dapat diubah saat validasi.</p>
            </div>
            <Field regId={reg.id} label="NIK" name="nik" defaultValue={reg.nik} inputMode="numeric" maxLength={16} required />
            <Field regId={reg.id} label="No. HP" name="phone" defaultValue={reg.phone} type="tel" required />
            <SelectField regId={reg.id} label="Jenis Kelamin" name="gender" defaultValue={reg.gender} required>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </SelectField>
            <SelectField regId={reg.id} label="Status Perkawinan" name="marital_status" defaultValue={reg.marital_status ?? ""} required>
              <option value="">Pilih status</option>
              <option value="Belum Kawin">Belum Kawin</option>
              <option value="Kawin">Kawin</option>
              <option value="Cerai Mati">Cerai Mati</option>
              <option value="Cerai Hidup">Cerai Hidup</option>
            </SelectField>
            <Field regId={reg.id} label="Tempat Lahir" name="birth_place" defaultValue={reg.birth_place} required />
            <Field regId={reg.id} label="Tanggal Lahir" name="birth_date" defaultValue={reg.birth_date} type="date" required />
          </Group>

          <Group icon={MapPin} title="Alamat">
            <TextareaField regId={reg.id} label="Alamat KTP" name="address_ktp" defaultValue={reg.address_ktp} required />
            <TextareaField regId={reg.id} label="Alamat Domisili" name="address_domicile" defaultValue={reg.address_domicile} required />
          </Group>

          <Group icon={BookOpen} title="Pendidikan">
            <SelectField regId={reg.id} label="Pendidikan Terakhir" name="last_education" defaultValue={reg.last_education ?? ""} required>
              <option value="">Pilih pendidikan</option>
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </SelectField>
            <Field regId={reg.id} label="Program Studi" name="study_program" defaultValue={reg.study_program} />
          </Group>

          <Group icon={Briefcase} title="Penempatan">
            <SelectField regId={reg.id} label="Unit Penempatan" name="home_unit_id" defaultValue={reg.home_unit_id ?? ""} required>
              <option value="">Pilih unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
              ))}
            </SelectField>
            <Field regId={reg.id} label="Jabatan" name="position_name" defaultValue={reg.position_name} required />
            <SelectField regId={reg.id} label="Ukuran Seragam" name="uniform_size" defaultValue={reg.uniform_size ?? ""} required>
              <option value="">Pilih ukuran</option>
              {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </SelectField>
          </Group>

          <Group icon={ShieldAlert} title="Kontak Darurat">
            <Field regId={reg.id} label="Nama" name="emergency_name" defaultValue={reg.emergency_name} required />
            <Field regId={reg.id} label="Hubungan" name="emergency_relation" defaultValue={reg.emergency_relation} required />
            <Field regId={reg.id} label="No. HP" name="emergency_phone" defaultValue={reg.emergency_phone} type="tel" required />
          </Group>

          <Group icon={Phone} title="Media Sosial">
            <Field regId={reg.id} label="Facebook" name="facebook" defaultValue={reg.facebook} />
            <Field regId={reg.id} label="Instagram" name="instagram" defaultValue={reg.instagram} />
            <Field regId={reg.id} label="Twitter / X" name="twitter" defaultValue={reg.twitter} />
          </Group>

          <Group icon={FileText} title="Catatan & Dokumen">
            <TextareaField regId={reg.id} label="Catatan" name="note" defaultValue={reg.note} />
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-medium">Dokumen pendaftaran</p>
              <div className="flex flex-wrap gap-2">
                <DocButton icon={IdCard} label="Scan KTP" url={reg.ktp_url} />
                <DocButton icon={UserRound} label="Pas Foto" url={reg.photo_url} />
              </div>
            </div>
          </Group>

          <section className="space-y-4 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Validasi Pendaftaran</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field regId={reg.id} label="Tanggal Masuk" name="join_date" type="date" required />
              <SelectField regId={reg.id} label="Status Pegawai" name="employee_status" defaultValue={reg.employee_status || "CPTY"} required>
                {EMPLOYEE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectField>
            </div>
            <Button type="submit" className="w-full">
              <Check className="h-4 w-4" /> Setujui &amp; Buat Akun Pegawai
            </Button>
          </section>
        </form>

        <form action={rejectRegistrationAction}>
          <input type="hidden" name="id" value={reg.id} />
          <Button type="submit" variant="ghost" className="w-full text-destructive hover:text-destructive">
            Tolak &amp; Hapus Pendaftaran
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocButton({
  icon: Icon,
  label,
  url,
}: {
  icon: React.ElementType;
  label: string;
  url: string | null;
}) {
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed px-3 py-1.5 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}: tidak ada
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border bg-background px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
    >
      <Icon className="h-4 w-4" /> Lihat {label}
    </a>
  );
}
