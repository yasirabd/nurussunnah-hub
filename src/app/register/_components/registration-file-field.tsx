"use client";

import { useState } from "react";

import { EVIDENCE_MAX_TOTAL_BYTES } from "@/lib/attendance-correction-upload.mjs";
import {
  prepareEvidenceFiles,
  replaceInputFiles,
  totalFileBytes,
} from "@/lib/evidence-upload-client";

type RegistrationFileFieldProps = {
  label: string;
  name: string;
  accept: string;
  helper?: string;
  required?: boolean;
};

/**
 * Input dokumen pendaftaran. Foto kamera dikecilkan di browser sebelum submit,
 * mengikuti form Koreksi Presensi & Izin Pegawai — tanpa ini foto 3 MB dikirim
 * utuh ke server lalu diteruskan ke Drive, sehingga submit terasa sangat lama.
 */
export function RegistrationFileField({
  label,
  name,
  accept,
  helper,
  required,
}: RegistrationFileFieldProps) {
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState("");

  async function prepare(event: React.ChangeEvent<HTMLInputElement>) {
    // `currentTarget` menjadi null setelah handler ini await, jadi simpan `target`
    // yang tetap valid melintasi langkah kompresi di bawah.
    const input = event.target;
    const selected = Array.from(input.files ?? []);
    if (!selected.length) {
      setMessage("");
      return;
    }

    setPreparing(true);
    setMessage("Menyiapkan berkas untuk upload...");

    try {
      const prepared = await prepareEvidenceFiles(selected);
      if (totalFileBytes(prepared.files) > EVIDENCE_MAX_TOTAL_BYTES) {
        throw new Error("Berkas terlalu besar. Maksimal 10 MB setelah foto dikompresi.");
      }
      replaceInputFiles(input, prepared.files);
      setMessage(
        prepared.wasOptimized ? "Foto sudah diperkecil dan siap diupload." : "Berkas siap diupload."
      );
    } catch (error) {
      input.value = "";
      setMessage(
        error instanceof Error ? error.message : "Berkas gagal disiapkan untuk upload."
      );
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={preparing}
        onChange={prepare}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
      />
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
      {message && (
        <p className="text-xs leading-5 text-muted-foreground" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
