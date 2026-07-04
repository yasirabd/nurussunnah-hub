"use client";

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
import { EMPLOYEE_STATUS_OPTIONS } from "@/lib/employee-status";
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
  position_name: string | null;
  uniform_size: string | null;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  ktp_url: string | null;
  photo_url: string | null;
  note: string | null;
  unit_label: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  const shown = value === null || value === undefined || value === "" ? "-" : value;
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{shown}</dd>
    </div>
  );
}

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
    <section className="space-y-3 rounded-[var(--radius-md)] border bg-secondary/20 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

export function RegistrationReview({ reg }: { reg: RegistrationDetail }) {
  const socials = [reg.facebook, reg.instagram, reg.twitter].filter(Boolean).length > 0;
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Tinjau</DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="h-6 w-6 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate">{reg.full_name}</DialogTitle>
              <DialogDescription className="truncate">{reg.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <Group icon={UserRound} title="Data Diri">
            <Item label="NIK" value={reg.nik} />
            <Item label="No. HP" value={reg.phone} />
            <Item label="Jenis Kelamin" value={reg.gender === "P" ? "Perempuan" : "Laki-laki"} />
            <Item label="Status Perkawinan" value={reg.marital_status} />
            <Item label="Tempat Lahir" value={reg.birth_place} />
            <Item label="Tanggal Lahir" value={fmtDate(reg.birth_date)} />
          </Group>

          <Group icon={MapPin} title="Alamat">
            <Item label="Alamat KTP" value={reg.address_ktp} />
            <Item label="Alamat Domisili" value={reg.address_domicile} />
          </Group>

          <Group icon={BookOpen} title="Pendidikan">
            <Item label="Pendidikan Terakhir" value={reg.last_education} />
            <Item label="Program Studi" value={reg.study_program} />
          </Group>

          <Group icon={Briefcase} title="Penempatan">
            <Item label="Unit Penempatan" value={reg.unit_label} />
            <Item label="Jabatan" value={reg.position_name} />
            <Item label="Ukuran Seragam" value={reg.uniform_size} />
          </Group>

          <Group icon={ShieldAlert} title="Kontak Darurat">
            <Item label="Nama" value={reg.emergency_name} />
            <Item label="Hubungan" value={reg.emergency_relation} />
            <Item label="No. HP" value={reg.emergency_phone} />
          </Group>

          {socials && (
            <Group icon={Phone} title="Media Sosial">
              <Item label="Facebook" value={reg.facebook} />
              <Item label="Instagram" value={reg.instagram} />
              <Item label="Twitter / X" value={reg.twitter} />
            </Group>
          )}

          <section className="space-y-3 rounded-[var(--radius-md)] border bg-secondary/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dokumen
            </h3>
            <div className="flex flex-wrap gap-2">
              <DocButton icon={IdCard} label="Scan KTP" url={reg.ktp_url} />
              <DocButton icon={UserRound} label="Pas Foto" url={reg.photo_url} />
            </div>
          </section>
        </div>

        <form
          action={approveRegistrationAction}
          className="space-y-4 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4"
        >
          <input type="hidden" name="id" value={reg.id} />
          <p className="text-sm font-semibold">Validasi Pendaftaran</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor={`join_${reg.id}`}>
                Tanggal Masuk <span className="text-destructive">*</span>
              </label>
              <Input id={`join_${reg.id}`} name="join_date" type="date" required />
              <p className="text-xs leading-5 text-muted-foreground">Dasar pembuatan NIY & awal jabatan.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor={`status_${reg.id}`}>
                Status Pegawai <span className="text-destructive">*</span>
              </label>
              <select
                id={`status_${reg.id}`}
                name="employee_status"
                defaultValue="CPTY"
                required
                className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {EMPLOYEE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-muted-foreground">Ditentukan saat validasi.</p>
            </div>
          </div>
          <Button type="submit" className="w-full">
            <Check className="h-4 w-4" /> Setujui &amp; Buat Akun Pegawai
          </Button>
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
