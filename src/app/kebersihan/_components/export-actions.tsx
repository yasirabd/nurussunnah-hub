"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { slideFileName } from "@/lib/kebersihan/filenames.mjs";

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
      toast.success(`${label} tersalin.`);
    } catch {
      toast.error(`${label} gagal disalin. Blok teksnya lalu salin manual.`);
    }
  }

  return (
    <div className="space-y-4">
      {canShare ? (
        <button
          type="button"
          onClick={shareAll}
          disabled={sharing}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          SIMPAN 4 SLIDE
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {blobs.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => download(index)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            Unduh Slide {index + 1}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Caption Instagram</h3>
        <textarea
          readOnly
          value={caption}
          rows={14}
          className="w-full rounded-lg border border-border bg-card p-3 text-sm"
        />
        <button
          type="button"
          onClick={() => copy(caption, "Caption")}
          className="w-full rounded-lg border border-border px-4 py-2 font-medium"
        >
          COPY CAPTION
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          Teks share ke grup SI Nurus Sunnah
        </h3>
        <textarea
          readOnly
          value={whatsapp}
          rows={10}
          className="w-full rounded-lg border border-border bg-card p-3 text-sm"
        />
        <button
          type="button"
          onClick={() => copy(whatsapp, "Teks WhatsApp")}
          className="w-full rounded-lg border border-border px-4 py-2 font-medium"
        >
          COPY TEKS WHATSAPP
        </button>
      </div>
    </div>
  );
}
