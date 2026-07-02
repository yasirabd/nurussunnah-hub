"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitCorrectionAction } from "../actions";

const KINDS = [
  { value: "LUPA_TAP", label: "Lupa Tap Kartu (Masuk/Pulang)" },
  { value: "KARTU_TERTINGGAL", label: "Kartu Tertinggal/Tidak Dibawa" },
  { value: "KARTU_HILANG_RUSAK", label: "Kartu Hilang/Rusak" },
  { value: "KENDALA_SISTEM", label: "Kendala Sistem/Perangkat Presensi" },
];

const selectCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CorrectionForm({
  fullName,
  unitName,
  phone,
}: {
  fullName: string;
  unitName: string;
  phone: string;
}) {
  const [kind, setKind] = useState("");
  const [timeScope, setTimeScope] = useState("");
  const today = localDateString();
  const needsCheckIn = timeScope === "MASUK" || timeScope === "KEDUANYA";
  const needsCheckOut = timeScope === "PULANG" || timeScope === "KEDUANYA";

  return (
    <form action={submitCorrectionAction} className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium">Koreksi presensi hanya untuk pegawai yang tetap masuk kerja.</p>
        <p className="mt-1 text-muted-foreground">
          Gunakan form izin jika tidak masuk, terlambat, pulang awal, atau izin sebagian jam kerja.
        </p>
      </div>

      <FormSection title="Data Pegawai" description="Data diambil otomatis dari profil akun.">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{fullName}</p>
          <p className="text-muted-foreground">
            {unitName} &middot; {phone || "No. WA belum diisi"}
          </p>
        </div>
      </FormSection>

      <FormSection title="Detail Koreksi" description="Pilih tanggal dan bagian presensi yang perlu diperbaiki.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event_date">Tanggal Kejadian</Label>
            <Input
              id="event_date"
              name="event_date"
              type="date"
              min={today}
              max={today}
              required
              value={today}
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Koreksi presensi hanya dapat diajukan untuk kejadian hari ini.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time_scope">Waktu yang Perlu Dikoreksi</Label>
            <select
              id="time_scope"
              name="time_scope"
              required
              className={selectCls}
              defaultValue=""
              onChange={(e) => setTimeScope(e.target.value)}
            >
              <option value="" disabled>Pilih</option>
              <option value="MASUK">Masuk</option>
              <option value="PULANG">Pulang</option>
              <option value="KEDUANYA">Keduanya</option>
            </select>
          </div>
        </div>

        {(needsCheckIn || needsCheckOut) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {needsCheckIn && (
              <div className="space-y-1.5">
                <Label htmlFor="requested_check_in">Waktu Masuk</Label>
                <Input id="requested_check_in" name="requested_check_in" type="time" required />
              </div>
            )}
            {needsCheckOut && (
              <div className="space-y-1.5">
                <Label htmlFor="requested_check_out">Waktu Pulang</Label>
                <Input id="requested_check_out" name="requested_check_out" type="time" required />
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="correction_kind">Jenis Koreksi Presensi</Label>
          <select
            id="correction_kind"
            name="correction_kind"
            required
            className={selectCls}
            defaultValue=""
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="" disabled>Pilih jenis koreksi</option>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          {kind === "KARTU_HILANG_RUSAK" && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Segera laporkan ke admin untuk pembuatan kartu pengganti.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reason">Keterangan</Label>
          <Textarea id="reason" name="reason" required rows={4} placeholder="Jelaskan kenapa presensi tidak tercatat." />
        </div>
      </FormSection>

      <FormSection title="Bukti Pendukung" description="Bukti bersifat opsional dan akan disimpan ke Google Drive Yayasan.">
        <div className="space-y-1.5">
          <Label htmlFor="bukti">Bukti Pendukung</Label>
          <Input id="bukti" name="bukti" type="file" accept="image/*,application/pdf" multiple />
          <p className="text-xs text-muted-foreground">
            Untuk kasus lupa tap biasanya tidak ada bukti fisik. Untuk kartu rusak/hilang, upload foto jika tersedia.
          </p>
        </div>
      </FormSection>

      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Jika disetujui, sistem akan memperbarui data presensi sesuai tanggal dan waktu yang dipilih.
        </p>
        <SubmitButton className="w-full sm:w-auto">
          Kirim Pengajuan Koreksi
        </SubmitButton>
      </div>
    </form>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
