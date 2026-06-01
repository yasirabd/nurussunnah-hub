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

const MARITAL_STATUS_OPTIONS = ["Sudah Kawin", "Belum Kawin", "Cerai"] as const;
const EDUCATION_OPTIONS = [
  "SD/Sederajat",
  "SMP/Sederajat",
  "SMA/SMK/Sederajat",
  "D1/D2/D3",
  "D4/S1",
  "S2",
  "S3",
] as const;
const EDUCATION_WITH_STUDY_PROGRAM = new Set<string>(["D1/D2/D3", "D4/S1", "S2", "S3"]);

interface ProfileEditFormProps {
  profile: Profile;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [selectedEducation, setSelectedEducation] = useState(profile.last_education ?? "");
  const showStudyProgram = EDUCATION_WITH_STUDY_PROGRAM.has(selectedEducation);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
            Perbarui data kontak, alamat, media sosial, dan data pribadi.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Personal</CardTitle>
          <CardDescription>Perubahan akan tersimpan ke profil akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateMyProfileAction} className="space-y-4">
            <FormSection title="Data Pribadi">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="gender">
                  Jenis Kelamin
                </label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={profile.gender}
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <SelectField label="Status Perkawinan" name="marital_status" defaultValue={profile.marital_status ?? ""}>
                <option value="">Pilih status perkawinan</option>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </SelectField>
              <Input name="birth_place" defaultValue={profile.birth_place ?? ""} placeholder="Tempat lahir" />
              <Input name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} placeholder="Tanggal lahir" />
              <SelectField
                label="Pendidikan Terakhir"
                name="last_education"
                value={selectedEducation}
                onChange={(event) => setSelectedEducation(event.target.value)}
                className="sm:col-span-2"
              >
                <option value="">Pilih pendidikan terakhir</option>
                {EDUCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </SelectField>
              {showStudyProgram && (
                <Input
                  name="study_program"
                  defaultValue={profile.study_program ?? ""}
                  placeholder="Program Studi"
                  className="sm:col-span-2"
                />
              )}
            </FormSection>

            <FormSection title="Kontak">
              <Input name="phone" defaultValue={profile.phone ?? ""} placeholder="No. HP" />
              <Input name="facebook" defaultValue={profile.facebook ?? ""} placeholder="Facebook" />
              <Input name="instagram" defaultValue={profile.instagram ?? ""} placeholder="Instagram" />
              <Input name="twitter" defaultValue={profile.twitter ?? ""} placeholder="Twitter" />
              <Textarea
                name="address_ktp"
                defaultValue={profile.address_ktp ?? ""}
                placeholder="Alamat KTP"
                className="min-h-24 sm:col-span-2"
              />
              <Textarea
                name="address_domicile"
                defaultValue={profile.address_domicile ?? ""}
                placeholder="Alamat domisili"
                className="min-h-24 sm:col-span-2"
              />
            </FormSection>

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
        </CardContent>
      </Card>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <label className="text-xs font-medium text-muted-foreground" htmlFor={props.id ?? props.name}>
        {label}
      </label>
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
