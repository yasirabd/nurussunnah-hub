"use client";

import Link from "next/link";
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

interface ProfileEditFormProps {
  profile: Profile;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
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
            Perbarui data kontak, alamat, media sosial, dan avatar profil.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Personal</CardTitle>
          <CardDescription>Perubahan akan tersimpan ke profil akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateMyProfileAction} className="grid gap-4 sm:grid-cols-2">
            <Input name="phone" defaultValue={profile.phone ?? ""} placeholder="No. HP" />
            <Input name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="URL avatar" />
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
            <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
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
