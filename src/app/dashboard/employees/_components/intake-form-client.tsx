"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste, Save, AlertTriangle, Wand2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { createIntakeEmployeeAction } from "../actions";
import {
  EmployeeFormFields,
  PositionField,
  RoleCheckboxes,
  type EmployeeFormValue,
  type UnitOption,
} from "../_components/employee-form-fields";
import { parseIntakeRow } from "@/lib/intake-parse.mjs";
import { buildNiy, nextSequence } from "@/lib/niy.mjs";

type ParsedIntake = ReturnType<typeof parseIntakeRow>["data"];

export function IntakeFormClient({ units, existingNiys }: { units: UnitOption[]; existingNiys: string[] }) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedIntake | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [joinDate, setJoinDate] = useState("");

  const nextSeq = useMemo(() => nextSequence(existingNiys), [existingNiys]);

  const niyResult = useMemo(
    () =>
      buildNiy({
        birthDateISO: parsed?.birth_date ?? "",
        joinDateISO: joinDate,
        gender: parsed?.gender ?? "",
        sequence: nextSeq,
      }),
    [parsed, joinDate, nextSeq],
  );

  function handleParse() {
    const firstLine = raw.split(/\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? "";
    const result = parseIntakeRow(firstLine);
    setParsed(result.data);
    setWarnings(result.warnings);
    setVersion((v) => v + 1);
  }

  const employee: EmployeeFormValue | null = useMemo(() => {
    if (!parsed) return null;
    const matchedUnit = units.find(
      (u) =>
        u.name.toLowerCase() === parsed.offer_unit.toLowerCase() ||
        u.code.toLowerCase() === parsed.offer_unit.toLowerCase(),
    );
    return {
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      gender: parsed.gender === "P" ? "P" : parsed.gender === "L" ? "L" : null,
      marital_status: parsed.marital_status || null,
      birth_place: parsed.birth_place || null,
      birth_date: parsed.birth_date || null,
      last_education: parsed.last_education || null,
      study_program: parsed.study_program || null,
      address_ktp: parsed.address_ktp || null,
      address_domicile: parsed.address_domicile || null,
      employee_status: "CPTY",
      active_status: "AKTIF",
      home_unit_id: matchedUnit?.id ?? null,
      employee_no: niyResult.niy || null,
    };
  }, [parsed, units, niyResult]);

  const unitHint = useMemo(() => {
    if (!parsed?.offer_unit) return null;
    const match = units.find(
      (u) => u.name.toLowerCase() === parsed.offer_unit.toLowerCase() || u.code.toLowerCase() === parsed.offer_unit.toLowerCase(),
    );
    return { raw: parsed.offer_unit, match };
  }, [parsed, units]);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
        <h2 className="text-base font-semibold tracking-normal">1. Tempel Data dari Google Sheet</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Salin <strong>satu baris respons</strong> dari Google Sheet (pilih sel baris, Ctrl+C),
          lalu tempel di bawah. Sistem akan mengisi formulir otomatis untuk Anda verifikasi.
        </p>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={4}
          placeholder="Tempel satu baris TSV di sini..."
          className="font-mono text-xs"
        />
        <Button type="button" onClick={handleParse} disabled={!raw.trim()}>
          <ClipboardPaste className="h-4 w-4" />
          Uraikan Data
        </Button>
      </section>

      {warnings.length > 0 && (
        <div className="space-y-1 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" /> Perlu diperiksa
          </p>
          <ul className="ml-6 list-disc space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed && (
        <form action={createIntakeEmployeeAction} className="space-y-5" key={`${version}-${joinDate}`}>
          <section className="space-y-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-normal">
              <Wand2 className="h-4 w-4" /> Generator NIY
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="niy-join-date">Tanggal Masuk Nurus Sunnah</label>
                <input
                  id="niy-join-date"
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <p className="text-xs leading-5 text-muted-foreground">Menentukan bagian tahun+bulan masuk (YYYYMM) pada NIY.</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium">NIY Terbentuk</span>
                {niyResult.niy ? (
                  <p className="font-mono text-lg font-semibold text-primary">{niyResult.niy}</p>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Lengkapi: {niyResult.missing.join(", ")}.
                  </p>
                )}
                <p className="text-xs leading-5 text-muted-foreground">
                  Nomor urut otomatis: {nextSeq}. NIY dapat diubah manual pada kolom NIY di bawah.
                </p>
              </div>
            </div>
          </section>
          {unitHint && (
            <div className="rounded-[var(--radius-md)] border bg-background px-4 py-3 text-sm">
              <span className="text-muted-foreground">Unit penempatan dari form: </span>
              <strong>{unitHint.raw}</strong>
              {unitHint.match ? (
                <span className="ml-2 text-primary">→ pilih &quot;{unitHint.match.code} - {unitHint.match.name}&quot; pada Unit Home.</span>
              ) : (
                <span className="ml-2 text-destructive">→ tidak cocok dengan daftar unit; pilih manual.</span>
              )}
              {parsed.offer_position && (
                <div className="mt-1">
                  <span className="text-muted-foreground">Posisi dari form: </span>
                  <strong>{parsed.offer_position}</strong>
                  <span className="ml-2 text-muted-foreground">(salin ke Jabatan Aktif).</span>
                </div>
              )}
            </div>
          )}

          <EmployeeFormFields employee={employee} units={units} showDefaultPasswordHelp />

          <input type="hidden" name="nik" value={parsed.nik} />
          <input type="hidden" name="ktp_url" value={parsed.ktp_url} />
          <input type="hidden" name="photo_url" value={parsed.photo_url} />

          <section className="space-y-4 rounded-[var(--radius-md)] border bg-secondary/30 p-4">
            <h2 className="text-base font-semibold tracking-normal">Data Intake (Kontak Darurat & Dokumen)</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <IntakeField label="NIK" name="nik_display" defaultValue={parsed.nik} readOnly helper="Tersimpan otomatis; ubah lewat NIK di data pribadi bila perlu." />
              <IntakeField label="Ukuran Seragam" name="uniform_size" defaultValue={parsed.uniform_size} placeholder="XS/S/M/L/XL/XXL/XXXL" />
              <IntakeField label="Nama Kontak Darurat" name="emergency_name" defaultValue={parsed.emergency_name} />
              <IntakeField label="Hubungan Kontak Darurat" name="emergency_relation" defaultValue={parsed.emergency_relation} />
              <IntakeField label="No. HP Kontak Darurat" name="emergency_phone" defaultValue={parsed.emergency_phone} />
              <IntakeLink label="Scan/Foto KTP" url={parsed.ktp_url} />
              <IntakeLink label="Pas Foto Formal" url={parsed.photo_url} />
            </div>
          </section>

          <RoleCheckboxes roles={["PEGAWAI"]} />
          <PositionField positionName={parsed.offer_position || undefined} />

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Link href="/dashboard/employees" className={buttonVariants({ variant: "outline" })}>Batal</Link>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Buat Pegawai
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function IntakeField({
  label,
  helper,
  defaultValue,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={props.name}>{label}</label>
      <input
        id={props.name}
        defaultValue={defaultValue ?? ""}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function IntakeLink({ label, url }: { label: string; url: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary underline">
          Buka dokumen
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">Tidak ada.</p>
      )}
    </div>
  );
}
