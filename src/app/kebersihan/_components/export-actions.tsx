"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  isLikelyInstagramLink,
  whatsappShareUrl,
  whatsappSubmission,
} from "@/lib/kebersihan/caption.mjs";
import { slideFileName } from "@/lib/kebersihan/filenames.mjs";

const PRIMARY =
  "ks-press flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground disabled:opacity-60";
const SECONDARY =
  "ks-press flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-border px-4 text-lg font-semibold";

export function ExportActions({
  blobs,
  unit,
  area,
  members,
  caption,
  startStep,
}: {
  blobs: Blob[];
  unit: string;
  area: string;
  members: string[];
  caption: string;
  startStep: number;
}) {
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState("");

  const trimmedLink = link.trim();
  const hasLink = trimmedLink.length > 0;
  const linkLooksRight = isLikelyInstagramLink(trimmedLink);

  const whatsapp = whatsappSubmission({
    unit,
    area,
    members,
    link: trimmedLink,
  });

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
        title: "Lomba 5R Nurus Sunnah 2026",
      });
    } catch {
      // The participant dismissed the share sheet; the download buttons remain.
    } finally {
      setSharing(false);
    }
  }

  function download(index: number) {
    const url = URL.createObjectURL(blobs[index]);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = slideFileName({ unit, area, slide: index + 1 });
    anchor.click();
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
    <div className="space-y-4">
      <Step
        number={startStep}
        title="Simpan 4 slide ke HP"
        hint="Keempatnya akan diunggah sebagai satu carousel."
      >
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
            <p className="text-base text-muted-foreground">
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
      </Step>

      <Step
        number={startStep + 1}
        title="Salin caption, lalu posting"
        hint="Buat satu postingan carousel berisi keempat slide, tempel captionnya, dan pastikan ada @nurussunnah.ig."
      >
        <textarea
          readOnly
          value={caption}
          rows={12}
          aria-label="Caption Instagram"
          className="w-full rounded-xl border-2 border-border bg-card p-3 text-base"
        />
        <button
          type="button"
          onClick={() => copy(caption, "Caption")}
          className={PRIMARY}
        >
          Salin Caption
        </button>
        <a
          href="https://www.instagram.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={SECONDARY}
        >
          Buka Instagram
        </a>
      </Step>

      <Step
        number={startStep + 2}
        title="Tempel link postingan Anda"
        hint="Buka postingan tadi, ketuk ⋯ lalu pilih Salin Tautan, dan tempel di sini."
      >
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          inputMode="url"
          placeholder="https://www.instagram.com/p/..."
          aria-label="Link postingan Instagram"
          className="min-h-14 w-full rounded-xl border-2 border-border bg-card px-4 text-base"
        />
        {hasLink && !linkLooksRight ? (
          <p className="text-base text-warning-foreground">
            Sepertinya ini bukan link Instagram. Periksa lagi, tapi Anda tetap
            bisa melanjutkan.
          </p>
        ) : null}
      </Step>

      <Step
        number={startStep + 3}
        title="Kirim ke grup SI Nurus Sunnah"
        hint="Link inilah bukti keikutsertaan yang dinilai juri."
      >
        <textarea
          readOnly
          value={whatsapp}
          rows={10}
          aria-label="Teks untuk grup WhatsApp"
          className="w-full rounded-xl border-2 border-border bg-card p-3 text-base"
        />
        {hasLink ? (
          <a
            href={whatsappShareUrl(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className={PRIMARY}
          >
            Kirim lewat WhatsApp
          </a>
        ) : (
          <button type="button" disabled className={PRIMARY}>
            Kirim lewat WhatsApp
          </button>
        )}
        {!hasLink ? (
          <p className="text-base text-muted-foreground">
            Tempel dulu link postingan di langkah {startStep + 2}.
          </p>
        ) : (
          <p className="text-base text-muted-foreground">
            WhatsApp akan terbuka dengan pesan yang sudah siap. Tinggal pilih
            grup <b>SI Nurus Sunnah</b>.
          </p>
        )}
        <button
          type="button"
          onClick={() => copy(whatsapp, "Teks WhatsApp")}
          className={SECONDARY}
        >
          Salin Teks Saja
        </button>
      </Step>
    </div>
  );
}

function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          <p className="mt-1 text-base leading-snug text-muted-foreground">
            {hint}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
