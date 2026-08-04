import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitRegistrationAction } from "./actions";

export const metadata = { title: "Pendaftaran Pegawai", robots: { index: false, follow: false } };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function Gate({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">Halaman tidak tersedia</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const invite = param(sp, "invite").toUpperCase();

  if (!invite) {
    return <Gate message="Tautan pendaftaran tidak valid. Hubungi HRD untuk memperoleh tautan undangan." />;
  }

  // Layar sukses harus tampil sebelum validasi kode (kode sudah TERPAKAI setelah submit).
  if (param(sp, "submitted") === "1") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary/20 p-6">
        <div className="w-full max-w-sm space-y-5 rounded-[var(--radius-lg)] border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-normal">Pendaftaran Berhasil</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Data Anda sudah kami terima dan sedang menunggu diperiksa oleh HRD. Jika disetujui,
              akun login Anda akan dibuatkan dan diinformasikan kemudian.
            </p>
          </div>
          <Link href="/auth/login" className="block">
            <Button variant="outline" className="w-full">Ke Halaman Masuk</Button>
          </Link>
        </div>
      </main>
    );
  }

  const error = param(sp, "error");

  const supabase = await createClient();
  const { data: valid } = await supabase.rpc("check_employee_invite", { p_code: invite });
  if (!valid) {
    // Submit yang gagal setelah kode terpakai tetap harus menampilkan sebabnya,
    // bukan gate generik yang menyembunyikan pesan error.
    return (
      <Gate
        message={
          error ||
          "Kode undangan tidak valid, sudah dipakai, atau kedaluwarsa. Minta kode baru ke HRD."
        }
      />
    );
  }

  const admin = createAdminClient();
  const { data: units } = await admin
    .from("units")
    .select("id, name, code")
    .eq("is_active", true)
    .order("code", { ascending: true });


  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">Pendaftaran Data Pegawai</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Isi formulir ini dengan data yang benar dan lengkap. Setelah dikirim, tim HRD akan
          memeriksa data Anda. Jika disetujui, nomor induk (NIY) dan akun login Anda akan
          dibuatkan secara otomatis.
        </p>
        <p className="text-xs text-muted-foreground">
          Tanda <span className="text-destructive">*</span> menandakan kolom wajib diisi.
        </p>
      </header>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={submitRegistrationAction} encType="multipart/form-data" className="space-y-5">
        <input type="hidden" name="invite_code" value={invite} />

        <Section title="Data Diri">
          <Field label="Nama Lengkap" name="full_name" required autoComplete="name" />
          <Field
            label="NIK (KTP)"
            name="nik"
            required
            inputMode="numeric"
            pattern="\d{16}"
            maxLength={16}
            helper="16 digit angka sesuai KTP, tanpa spasi."
          />
          <Select label="Jenis Kelamin" name="gender" defaultValue="L">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </Select>
          <Select label="Status Perkawinan" name="marital_status" defaultValue="" required>
            <option value="">Pilih status</option>
            <option value="Belum Kawin">Belum Kawin</option>
            <option value="Kawin">Kawin</option>
            <option value="Cerai Mati">Cerai Mati</option>
            <option value="Cerai Hidup">Cerai Hidup</option>
          </Select>
          <Field label="Tempat Lahir" name="birth_place" required />
          <Field label="Tanggal Lahir" name="birth_date" type="date" required />
        </Section>

        <Section title="Kontak & Alamat">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field
            label="No. HP"
            name="phone"
            required
            type="tel"
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            pattern="^(\+?62|0)\d{8,13}$"
            title="Gunakan format 08xxxxxxxxxx atau +62xxxxxxxxxx"
            helper="Nomor aktif (WhatsApp), contoh 081234567890."
          />
          <Field label="Alamat KTP" name="address_ktp" required helper="Sesuai yang tertera di KTP." />
          <Field label="Alamat Domisili" name="address_domicile" required helper="Alamat tempat tinggal saat ini." />
        </Section>

        <Section title="Pendidikan">
          <Select label="Pendidikan Terakhir" name="last_education" defaultValue="" required>
            <option value="">Pilih pendidikan</option>
            <option value="SD/Sederajat">SD/Sederajat</option>
            <option value="SMP/Sederajat">SMP/Sederajat</option>
            <option value="SMA/Sederajat">SMA/Sederajat</option>
            <option value="D3">D3</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
          </Select>
          <Field label="Program Studi / Jurusan" name="study_program" helper="Isi bila pendidikan D3 ke atas." />
        </Section>

        <Section title="Media Sosial (opsional)">
          <Field label="Facebook" name="facebook" placeholder="URL atau username" />
          <Field label="Instagram" name="instagram" placeholder="@username" />
          <Field label="Twitter / X" name="twitter" placeholder="@username" />
        </Section>

        <Section title="Penempatan">
          <Select label="Unit penempatan" name="home_unit_id" defaultValue="" required helper="Unit tempat Anda akan ditempatkan.">
            <option value="">Pilih unit</option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} - {u.name}
              </option>
            ))}
          </Select>
          <Field label="Jabatan" name="position_name" placeholder="Contoh: Guru Matematika" required helper="Posisi jabatan" />
        </Section>

        <Section title="Kontak Darurat">
          <Field label="Nama Kontak Darurat" name="emergency_name" required />
          <Field label="Hubungan" name="emergency_relation" placeholder="Contoh: Orang tua, Pasangan" required helper="Hubungan Anda dengan kontak darurat." />
          <Field
            label="No. HP Kontak Darurat"
            name="emergency_phone"
            required
            type="tel"
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            pattern="^(\+?62|0)\d{8,13}$"
            title="Gunakan format 08xxxxxxxxxx atau +62xxxxxxxxxx"
          />
        </Section>

        <Section title="Dokumen & Seragam">
          <FileField label="Scan / Foto KTP" name="ktp_file" helper="Format gambar atau PDF." accept="image/*,application/pdf" required />
          <FileField label="Pas Foto Formal" name="photo_file" helper="Foto formal terbaru." accept="image/*" required />
          <Select label="Ukuran Seragam" name="uniform_size" defaultValue="" required helper="Untuk pengadaan seragam kerja.">
            <option value="">Pilih ukuran</option>
            {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((sz) => (
              <option key={sz} value={sz}>{sz}</option>
            ))}
          </Select>
        </Section>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit">Kirim Data Pendaftaran</Button>
        </div>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({
  name,
  label,
  required,
}: {
  name?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium" htmlFor={name}>
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

function Field({
  label,
  helper,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel name={props.name} label={label} required={props.required} />
      <Input id={props.name} {...props} />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function FileField({
  label,
  helper,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel name={props.name} label={label} required={props.required} />
      <input
        id={props.name}
        type="file"
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        {...props}
      />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function Select({
  label,
  helper,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel name={props.name} label={label} required={props.required} />
      <select
        id={props.name}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {children}
      </select>
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}
