"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { slideFileName } from "@/lib/kebersihan/filenames.mjs";

const PRIMARY =
  "ks-press min-h-14 w-full rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground disabled:opacity-60";
const SECONDARY =
  "ks-press min-h-14 w-full rounded-xl border-2 border-border px-4 text-lg font-semibold";

export function ExportActions({
  blobs,
  unit,
  area,
  caption,
  whatsapp,
}: {
  blobs: Blob[];
  unit: string;
  area: string;
  caption: string;
  whatsapp: string;
}) {
  const [sharing, setSharing] = useState(false);

  const files = useMemo(
    () =>
      blobs.map(
        (blob, index) =>
          new File([blob], slideFileName({ unit, area, slide: index + 1 }), {
            type: "image/jpeg",
          })
      ),
    [blobs, unit, area]
  );

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files });

  async function shareAll() {
    setSharing(true);
    try {
      await navigator.share({
        files,
        title: "Lomba Kebersihan Nurus Sunnah 2026",
      });
    } catch {
      // The participant dismissed the share sheet; the download buttons remain.
    } finally {
      setSharing(false);
    }
  }

  function download(index: number) {
    const url = URL.createObjectURL(blobs[index]);
    const link = document.createElement("a");
    link.href = url;
    link.download = slideFileName({ unit, area, slide: index + 1 });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} sudah tersalin.`);
    } catch {
      toast.error(`${label} gagal disalin. Blok teksnya lalu salin manual.`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {canShare ? (
          <>
            <button
              type="button"
              onClick={shareAll}
              disabled={sharing}
              className={PRIMARY}
            >
              Simpan 4 Slide ke HP
            </button>
            <p className="text-center text-base text-muted-foreground">
              Pilih <b>Simpan Gambar</b> saat menu muncul.
            </p>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {blobs.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => download(index)}
              className="ks-press min-h-14 rounded-xl border-2 border-border px-3 text-base font-semibold"
            >
              Unduh Slide {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Caption Instagram</h3>
        <textarea
          readOnly
          value={caption}
          rows={14}
          aria-label="Caption Instagram"
          className="w-full rounded-xl border-2 border-border bg-card p-3 text-base"
        />
        <button
          type="button"
          onClick={() => copy(caption, "Caption")}
          className={SECONDARY}
        >
          Salin Caption
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          Teks untuk grup SI Nurus Sunnah
        </h3>
        <textarea
          readOnly
          value={whatsapp}
          rows={10}
          aria-label="Teks share WhatsApp"
          className="w-full rounded-xl border-2 border-border bg-card p-3 text-base"
        />
        <button
          type="button"
          onClick={() => copy(whatsapp, "Teks WhatsApp")}
          className={SECONDARY}
        >
          Salin Teks WhatsApp
        </button>
      </div>
    </div>
  );
}
