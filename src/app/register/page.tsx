import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPLOYEE_STATUS_OPTIONS } from "@/lib/employee-status";
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

  // Validate the invite code (active + not expired) before showing the form.
  const supabase = await createClient();
  const { data: valid } = await supabase.rpc("check_employee_invite", { p_code: invite });
  if (!valid) {
    return <Gate message="Kode undangan tidak valid, sudah dipakai, atau kedaluwarsa. Minta kode baru ke HRD." />;
  }

  const submitted = param(sp, "submitted") === "1";
  const error = param(sp, "error");

  const admin = createAdminClient();
  const { data: units } = await admin
    .from("units")
    .select("id, name, code")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-[var(--radius-md)] border bg-secondary/30 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold">Pendaftaran terkirim</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Data Anda telah kami terima dan menunggu validasi HRD. Setelah divalidasi, akun Anda
            akan dibuatkan dan diinformasikan lebih lanjut. Kode undangan ini sudah tidak berlaku.
          </p>
          <Link href="/auth/login">
            <Button variant="outline">Ke Halaman Masuk</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">Pendaftaran Data Pegawai</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Lengkapi data diri Anda. Data akan diverifikasi HRD sebelum tersimpan sebagai pegawai.
        </p>
      </header>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={submitRegistrationAction} className="space-y-5">
        <input type="hidden" name="invite_code" value={invite} />

        <Section title="Data Diri">
          <Field label="Nama Lengkap" name="full_name" required />
          <Field label="NIY" name="employee_no" helper="Spasi dihapus & huruf dikapitalkan." required />
          <Field label="Email" name="email" type="email" required />
          <Field label="No. HP" name="phone" />
          <Select label="Jenis Kelamin" name="gender" defaultValue="L">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </Select>
          <Select label="Status Perkawinan" name="marital_status" defaultValue="">
            <option value="">Pilih status</option>
            <option value="Belum Kawin">Belum Kawin</option>
            <option value="Kawin">Kawin</option>
            <option value="Cerai Mati">Cerai Mati</option>
            <option value="Cerai Hidup">Cerai Hidup</option>
          </Select>
          <Field label="Tempat Lahir" name="birth_place" />
          <Field label="Tanggal Lahir" name="birth_date" type="date" />
        </Section>

        <Section title="Pendidikan & Alamat">
          <Select label="Pendidikan Terakhir" name="last_education" defaultValue="">
            <option value="">Pilih pendidikan</option>
            <option value="SD/Sederajat">SD/Sederajat</option>
            <option value="SMP/Sederajat">SMP/Sederajat</option>
            <option value="SMA/Sederajat">SMA/Sederajat</option>
            <option value="D3">D3</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
          </Select>
          <Field label="Program Studi / Jurusan" name="study_program" />
          <Field label="Alamat KTP" name="address_ktp" />
          <Field label="Alamat Domisili" name="address_domicile" />
        </Section>

        <Section title="Kepegawaian">
          <Select label="Unit yang Dituju" name="home_unit_id" defaultValue="">
            <option value="">Pilih unit</option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} - {u.name}
              </option>
            ))}
          </Select>
          <Select label="Status Pegawai" name="employee_status" defaultValue="CPTY">
            {EMPLOYEE_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="note">Catatan (opsional)</label>
            <textarea
              id="note"
              name="note"
              className="min-h-24 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </Section>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit">Kirim Pendaftaran</Button>
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

function Field({
  label,
  helper,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={props.name}>{label}</label>
      <Input id={props.name} {...props} />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={props.name}>{label}</label>
      <select
        id={props.name}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
