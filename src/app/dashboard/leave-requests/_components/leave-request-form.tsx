"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { EVIDENCE_MAX_FILE_BYTES } from "@/lib/attendance-correction-upload.mjs";
import {
  prepareEvidenceFiles,
  replaceInputFiles,
} from "@/lib/evidence-upload-client";
import { submitLeaveRequestAction } from "../actions";

const LEAVE_CATEGORIES = [
  "Sakit",
  "Keperluan Keluarga",
  "Terlambat/Kendala Perjalanan",
  "Duka Cita (Kedukaan)",
  "Acara Khusus (Wisuda/Pernikahan/Ibadah)",
  "Mudik/Perjalanan Luar Kota",
  "Pendidikan/Akademik",
  "Kedinasan/Tugas Kantor",
  "Administrasi Pribadi",
  "Lainnya",
];

const TIME_TYPES = [
  { value: "SEHARIAN_PENUH", label: "Seharian Penuh" },
  { value: "DATANG_TERLAMBAT", label: "Datang Terlambat" },
  { value: "PULANG_LEBIH_AWAL", label: "Pulang Lebih Awal" },
  { value: "SEBAGIAN_JAM_KERJA", label: "Sebagian Jam Kerja" },
];

const selectCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function LeaveRequestForm({
  fullName,
  unitName,
  phone,
}: {
  fullName: string;
  unitName: string;
  phone: string;
}) {
  const [multiDay, setMultiDay] = useState(false);
  const [unitHead, setUnitHead] = useState<"SUDAH" | "BELUM" | "">("");
  const [startDate, setStartDate] = useState("");
  const [category, setCategory] = useState("");
  const unitHeadEvidenceRef = useRef<HTMLInputElement>(null);
  const leaveEvidenceRef = useRef<HTMLInputElement>(null);
  const [isPreparingEvidence, setIsPreparingEvidence] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [evidenceMessageFor, setEvidenceMessageFor] = useState("");
  const [noEvidenceAck, setNoEvidenceAck] = useState(false);
  const today = localDateString();
  const maxStartDate = localDateString(addDays(new Date(), 7));

  const blocked = unitHead === "BELUM";
  const evidenceRequired =
    category === "Duka Cita (Kedukaan)" ||
    category === "Acara Khusus (Wisuda/Pernikahan/Ibadah)" ||
    category === "Administrasi Pribadi" ||
    (category === "Sakit" && multiDay);
  const evidenceHelper = evidenceRequired
    ? "Bukti wajib untuk jenis izin ini. Upload foto atau PDF pendukung."
    : "Bukti opsional. Jika tidak ada bukti fisik, centang pernyataan di bawah.";

  function handleNoEvidenceAck(checked: boolean) {
    setNoEvidenceAck(checked);
    if (checked && leaveEvidenceRef.current) {
      leaveEvidenceRef.current.value = "";
      setEvidenceMessage("");
      setEvidenceMessageFor("");
    }
  }

  async function prepareLeaveEvidence(event: React.ChangeEvent<HTMLInputElement>) {
    // `currentTarget` is nulled out once this handler awaits, so hold on to
    // `target` which stays valid across the async compression step below.
    const input = event.target;
    const selectedFiles = Array.from(input.files ?? []);
    if (!selectedFiles.length) {
      setEvidenceMessage("");
      setEvidenceMessageFor("");
      return;
    }

    setIsPreparingEvidence(true);
    setEvidenceMessageFor(input.name);
    setEvidenceMessage("Menyiapkan foto untuk upload...");

    try {
      const prepared = await prepareEvidenceFiles(selectedFiles, {
        maxFileBytes: EVIDENCE_MAX_FILE_BYTES,
      });

      replaceInputFiles(input, prepared.files);
      setEvidenceMessage(
        prepared.wasOptimized
          ? "Foto kamera sudah diperkecil dan siap diupload."
          : "Bukti siap diupload."
      );
    } catch (error) {
      input.value = "";
      setEvidenceMessage(
        error instanceof Error ? error.message : "Bukti gagal disiapkan untuk upload."
      );
    } finally {
      setIsPreparingEvidence(false);
    }
  }

  return (
    <form action={submitLeaveRequestAction} className="space-y-5">
      <FormSection title="Data Pegawai" description="Data diambil otomatis dari profil akun.">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{fullName}</p>
          <p className="text-muted-foreground">
            {unitName} &middot; {phone || "No. WA belum diisi"}
          </p>
          <a href="/dashboard/profile" className="text-xs text-primary underline">
            Bukan Anda? Perbarui data profil
          </a>
        </div>
      </FormSection>

      <FormSection title="Detail Izin" description="Isi tanggal, kategori, dan alasan izin.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Tanggal Izin (Mulai)</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              min={today}
              max={maxStartDate}
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tanggal mulai izin hanya bisa dari hari ini sampai H+7. Tanggal selesai boleh lebih lama.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => setMultiDay(e.target.checked)}
              />
              Izin lebih dari 1 hari
            </Label>
            {multiDay ? (
              <Input name="end_date" type="date" min={startDate || today} required />
            ) : (
              <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                Tanggal selesai otomatis sama dengan tanggal mulai.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="leave_category">Jenis Izin</Label>
            <select
              id="leave_category"
              name="leave_category"
              required
              className={selectCls}
              defaultValue=""
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>Pilih jenis izin</option>
              {LEAVE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave_time_type">Jenis Waktu Izin</Label>
            <select id="leave_time_type" name="leave_time_type" required className={selectCls} defaultValue="">
              <option value="" disabled>Pilih waktu izin</option>
              {TIME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reason">Permohonan Izin (Keterangan)</Label>
          <Textarea id="reason" name="reason" required rows={4} placeholder="Tulis alasan spesifik dan konteks izin." />
        </div>
      </FormSection>

      <FormSection title="Persetujuan Kepala Unit" description="Pengajuan izin hanya bisa dikirim setelah izin kepala unit diperoleh.">
        <div className="space-y-1.5">
          <Label>Sudah Diizinkan Kepala Unit?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="radio" name="unit_head_approved" value="SUDAH"
                onChange={() => setUnitHead("SUDAH")} required /> Sudah
            </label>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="radio" name="unit_head_approved" value="BELUM"
                onChange={() => setUnitHead("BELUM")} /> Belum
            </label>
          </div>
          {blocked && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Silakan minta izin kepala unit terlebih dahulu sebelum mengajukan form ini.
            </p>
          )}
        </div>

        {unitHead === "SUDAH" && (
          <div className="space-y-1.5">
            <Label htmlFor="bukti_ss_kepala_unit">Bukti Screenshot Izin Kepala Unit</Label>
            <Input
              ref={unitHeadEvidenceRef}
              id="bukti_ss_kepala_unit"
              name="bukti_ss_kepala_unit"
              type="file"
              accept="image/*"
              required
              disabled={isPreparingEvidence}
              onChange={prepareLeaveEvidence}
            />
            <p className="text-xs text-muted-foreground">
              Maksimal 5 MB per file. Foto yang lebih besar akan diperkecil otomatis.
            </p>
            {evidenceMessageFor === "bukti_ss_kepala_unit" && evidenceMessage && (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {evidenceMessage}
              </p>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Bukti Izin" description="File akan disimpan ke Google Drive Yayasan.">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="bukti_izin">Bukti Izin</Label>
            <span className={evidenceRequired ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
              {evidenceRequired ? "Wajib" : "Opsional"}
            </span>
          </div>
          <Input
            ref={leaveEvidenceRef}
            id="bukti_izin"
            name="bukti_izin"
            type="file"
            accept="image/*,application/pdf"
            multiple
            required={evidenceRequired}
            disabled={isPreparingEvidence || (!evidenceRequired && noEvidenceAck)}
            onChange={prepareLeaveEvidence}
          />
          <p className="text-xs text-muted-foreground">
            {evidenceHelper} Maksimal 5 MB per file. Foto yang lebih besar akan diperkecil otomatis.
          </p>
          {evidenceMessageFor === "bukti_izin" && evidenceMessage && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {evidenceMessage}
            </p>
          )}
          {!evidenceRequired && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="no_evidence_ack"
                className="mt-0.5"
                checked={noEvidenceAck}
                onChange={(event) => handleNoEvidenceAck(event.target.checked)}
              />
              <span>Saya menyatakan tidak ada bukti fisik untuk izin ini, dan bersedia melengkapi jika diminta Yayasan.</span>
            </label>
          )}
        </div>
      </FormSection>

      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Pastikan file sudah benar. Proses upload ke Drive dapat memerlukan beberapa detik.
        </p>
        <SubmitButton
          disabled={blocked || isPreparingEvidence}
          className="w-full sm:w-auto"
          pendingText="Mengirim pengajuan..."
        >
          Kirim Pengajuan Izin
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
