"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { updateMyProfileAction } from "@/app/dashboard/profile/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/types/database";

const MARITAL_STATUS_OPTIONS = ["Belum Kawin", "Kawin", "Cerai Mati", "Cerai Hidup"] as const;
const EDUCATION_OPTIONS = [
  "SD/Sederajat",
  "SMP/Sederajat",
  "SMA/Sederajat",
  "D3",
  "S1",
  "S2",
  "S3",
] as const;
const EDUCATION_WITH_STUDY_PROGRAM = new Set<string>(["D3", "S1", "S2", "S3"]);
const UNIFORM_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type IntakeValue = {
  emergency_name?: string | null;
  emergency_relation?: string | null;
  emergency_phone?: string | null;
  uniform_size?: string | null;
};

interface ProfileEditFormProps {
  profile: Profile;
  intake?: IntakeValue | null;
}

export function ProfileEditForm({ profile, intake }: ProfileEditFormProps) {
  const [selectedEducation, setSelectedEducation] = useState(profile.last_education ?? "");
  const showStudyProgram = EDUCATION_WITH_STUDY_PROGRAM.has(selectedEducation);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/profile"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-3 -ml-3 w-fit" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Profil Saya
        </Link>
        <h1 className="text-2xl font-semibold tracking-normal">Edit Profil</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Perbarui data pribadi, kontak, alamat, media sosial, kontak darurat, dan ukuran seragam.
          Data identitas seperti NIY dan NIK hanya dapat diubah oleh HRD.
        </p>
      </div>

      <form action={updateMyProfileAction} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Pribadi</CardTitle>
            <CardDescription>Identitas dasar dan riwayat pendidikan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="NIY" value={profile.employee_no} />
              <ReadOnlyField label="NIK (KTP)" value={profile.nik} />
              <SelectField label="Jenis Kelamin" name="gender" defaultValue={profile.gender}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </SelectField>
              <SelectField
                label="Status Perkawinan"
                name="marital_status"
                defaultValue={profile.marital_status ?? ""}
              >
                <option value="">Pilih status</option>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </SelectField>
              <TextField label="Tempat Lahir" name="birth_place" defaultValue={profile.birth_place ?? ""} />
              <TextField label="Tanggal Lahir" name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} />
              <SelectField
                label="Pendidikan Terakhir"
                name="last_education"
                value={selectedEducation}
                onChange={(event) => setSelectedEducation(event.target.value)}
                className="sm:col-span-2"
              >
                <option value="">Pilih pendidikan</option>
                {EDUCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </SelectField>
              {showStudyProgram && (
                <TextField
                  label="Program Studi / Jurusan"
                  name="study_program"
                  defaultValue={profile.study_program ?? ""}
                  className="sm:col-span-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontak & Alamat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="No. HP" name="phone" type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" defaultValue={profile.phone ?? ""} />
              <div className="hidden sm:block" aria-hidden />
              <TextareaField label="Alamat KTP" name="address_ktp" defaultValue={profile.address_ktp ?? ""} />
              <TextareaField label="Alamat Domisili" name="address_domicile" defaultValue={profile.address_domicile ?? ""} />
              <TextField label="Facebook" name="facebook" placeholder="URL atau username" defaultValue={profile.facebook ?? ""} />
              <TextField label="Instagram" name="instagram" placeholder="@username" defaultValue={profile.instagram ?? ""} />
              <TextField label="Twitter / X" name="twitter" placeholder="@username" defaultValue={profile.twitter ?? ""} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontak Darurat & Seragam</CardTitle>
            <CardDescription>Data pendukung kepegawaian.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nama Kontak Darurat" name="emergency_name" defaultValue={intake?.emergency_name ?? ""} />
              <TextField label="Hubungan" name="emergency_relation" placeholder="Contoh: Orang tua, Pasangan" defaultValue={intake?.emergency_relation ?? ""} />
              <TextField label="No. HP Kontak Darurat" name="emergency_phone" type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" defaultValue={intake?.emergency_phone ?? ""} />
              <SelectField label="Ukuran Seragam" name="uniform_size" defaultValue={intake?.uniform_size ?? ""}>
                <option value="">Pilih ukuran</option>
                {UNIFORM_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </SelectField>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href="/dashboard/profile" className={buttonVariants({ variant: "outline" })}>
            Batal
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}

function FieldWrap({ label, className, htmlFor, children }: { label: string; className?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <label className="text-sm font-medium" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function TextField({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <FieldWrap label={label} className={className} htmlFor={id}>
      <Input id={id} {...props} />
    </FieldWrap>
  );
}

function TextareaField({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <FieldWrap label={label} className={className ? `sm:col-span-2 ${className}` : "sm:col-span-2"} htmlFor={id}>
      <Textarea id={id} className="min-h-24" {...props} />
    </FieldWrap>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <FieldWrap label={label}>
      <div className="flex h-10 items-center rounded-[var(--radius-sm)] border border-input bg-secondary/50 px-3 text-sm text-muted-foreground">
        {value || "-"}
      </div>
    </FieldWrap>
  );
}

function SelectField({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <FieldWrap label={label} className={className} htmlFor={id}>
      <select
        id={id}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {children}
      </select>
    </FieldWrap>
  );
}