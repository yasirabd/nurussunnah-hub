"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import { SLOT_IDS } from "@/lib/kebersihan/slot-sizes.mjs";
import { UNIT_OTHER } from "@/lib/kebersihan/units.mjs";
import {
  instagramCaption,
  whatsappSubmission,
} from "@/lib/kebersihan/caption.mjs";
import { decodePhoto } from "@/lib/kebersihan/image-decode";
import { rasterizeSlide } from "@/lib/kebersihan/rasterize";
import { AreaForm } from "./area-form";
import { ExportActions } from "./export-actions";
import { InAppBrowserNotice } from "./in-app-browser-notice";
import type { SlotState } from "./photo-slot";
import { PhotoSlotControls } from "./photo-slot";
import { SlideStage } from "./slide-stage";
import { SlideDetail } from "./slides/slide-detail";
import { SlideHero } from "./slides/slide-hero";
import { SlideImprovement } from "./slides/slide-improvement";
import { SlideWide } from "./slides/slide-wide";

type Slots = Partial<Record<SlotId, SlotState>>;

const STEPS = [
  {
    title: "Siapkan Foto",
    body: "Bersihkan dan tata area, lalu ambil 5 foto: hero, wide view, detail, sebelum, dan sesudah.",
  },
  {
    title: "Upload",
    body: "Isi unit, nama area, dan anggota, lalu unggah kelima foto di halaman ini.",
  },
  {
    title: "Download",
    body: "Buat carousel, simpan 4 slide, lalu salin caption yang sudah disiapkan.",
  },
  {
    title: "Posting",
    body: "Unggah keempat slide sebagai satu carousel, tag @nurussunnah.ig, lalu bagikan linknya.",
  },
];

export function GeneratorClient() {
  const [unit, setUnit] = useState("");
  const [unitOther, setUnitOther] = useState("");
  const [area, setArea] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [slots, setSlots] = useState<Slots>({});
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [busy, setBusy] = useState(false);

  const slideNodes = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const slotsRef = useRef<Slots>(slots);
  slotsRef.current = slots;

  // Object URLs outlive React state, so they are released when the page closes.
  useEffect(() => {
    return () => {
      for (const state of Object.values(slotsRef.current)) {
        if (state) URL.revokeObjectURL(state.src);
      }
    };
  }, []);

  const resolvedUnit = unit === UNIT_OTHER ? unitOther.trim() : unit;
  const cleanArea = area.trim();
  const cleanMembers = members.map((name) => name.trim()).filter(Boolean);
  const ready =
    Boolean(resolvedUnit) &&
    Boolean(cleanArea) &&
    cleanMembers.length > 0 &&
    SLOT_IDS.every((id) => slots[id]);

  const previewArea = cleanArea || "Nama Area";
  const previewUnit = resolvedUnit || "Nama Unit";

  async function pickPhoto(id: SlotId, file: File) {
    try {
      const decoded = await decodePhoto(file);
      setSlots((current) => {
        const previous = current[id];
        if (previous) URL.revokeObjectURL(previous.src);
        return { ...current, [id]: { ...decoded, zoom: 1, posX: 50, posY: 50 } };
      });
      setBlobs([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto gagal dibaca.");
    }
  }

  async function generate() {
    setBusy(true);
    setBlobs([]);
    try {
      const results: Blob[] = [];
      // Sequential on purpose: four 1080x1350 rasterizations in parallel will
      // exhaust memory on mid-range phones.
      for (const node of slideNodes.current) {
        if (!node) throw new Error("Slide belum siap. Coba lagi.");
        results.push(await rasterizeSlide(node));
      }
      setBlobs(results);
      toast.success("4 slide siap diunduh.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat slide. Coba lagi."
      );
    } finally {
      setBusy(false);
    }
  }

  const caption = instagramCaption({
    unit: resolvedUnit,
    area: cleanArea,
    members: cleanMembers,
  });
  const whatsapp = whatsappSubmission({
    unit: resolvedUnit,
    area: cleanArea,
    members: cleanMembers,
    link: "",
  });

  const slideProps = { areaName: previewArea, unitName: previewUnit };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-12 px-4 py-10">
      <header className="space-y-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kebersihan/logo.png"
          alt="Yayasan Islam Nurus Sunnah"
          className="mx-auto h-24 w-auto"
        />
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Lomba Kebersihan Area Kerja
          </h1>
          <p className="text-muted-foreground">
            Yayasan Islam Nurus Sunnah 2026
          </p>
        </div>
        <p className="text-sm font-medium">Sabtu, 15 Agustus 2026</p>
        <p className="text-lg font-semibold">
          Bersih Tempatnya, Bangga Menjaganya
        </p>
        <p className="text-sm text-muted-foreground">
          Cerdas • Mandiri • Berkarakter Qur’ani
        </p>
        <a
          href="#generator"
          className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          BUAT CAROUSEL
        </a>
      </header>

      <InAppBrowserNotice />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Petunjuk Singkat</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-lg border border-border bg-card p-4"
            >
              <span className="text-xs font-semibold text-primary">
                LANGKAH {index + 1}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="generator" className="space-y-6">
        <h2 className="text-lg font-semibold">Isi Data Area</h2>
        <AreaForm
          unit={unit}
          unitOther={unitOther}
          area={area}
          members={members}
          onUnitChange={setUnit}
          onUnitOtherChange={setUnitOther}
          onAreaChange={setArea}
          onMembersChange={setMembers}
        />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Unggah 5 Foto</h2>
          <p className="rounded-lg bg-secondary p-3 text-sm">
            Foto diproses di HP Anda dan tidak diunggah ke server.
          </p>
          {SLOT_IDS.map((id) => (
            <PhotoSlotControls
              key={id}
              slot={id}
              state={slots[id] ?? null}
              onPick={(file) => pickPhoto(id, file)}
              onChange={(next) =>
                setSlots((current) => ({ ...current, [id]: next }))
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Preview</h2>
        <div className="space-y-4">
          <SlideStage
            nodeRef={(node) => {
              slideNodes.current[0] = node;
            }}
          >
            <SlideHero {...slideProps} hero={slots.hero ?? null} />
          </SlideStage>
          <SlideStage
            nodeRef={(node) => {
              slideNodes.current[1] = node;
            }}
          >
            <SlideWide {...slideProps} wide={slots.wide ?? null} />
          </SlideStage>
          <SlideStage
            nodeRef={(node) => {
              slideNodes.current[2] = node;
            }}
          >
            <SlideDetail {...slideProps} detail={slots.detail ?? null} />
          </SlideStage>
          <SlideStage
            nodeRef={(node) => {
              slideNodes.current[3] = node;
            }}
          >
            <SlideImprovement
              {...slideProps}
              before={slots.before ?? null}
              after={slots.after ?? null}
            />
          </SlideStage>
        </div>
      </section>

      <section className="space-y-4">
        <button
          type="button"
          onClick={generate}
          disabled={!ready || busy}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Membuat slide…" : "BUAT CAROUSEL"}
        </button>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Lengkapi unit, nama area, minimal satu anggota, dan kelima foto
            terlebih dahulu.
          </p>
        ) : null}

        {blobs.length === 4 ? (
          <ExportActions
            blobs={blobs}
            unit={resolvedUnit}
            area={cleanArea}
            caption={caption}
            whatsapp={whatsapp}
          />
        ) : null}
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Setelah Slide Tersimpan</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Unggah keempat slide sebagai satu carousel di Instagram.</li>
          <li>
            Gunakan caption yang disediakan dan tag <b>@nurussunnah.ig</b>.
          </li>
          <li>Buka postingan, lalu salin linknya.</li>
          <li>
            Bagikan link tersebut ke grup <b>SI Nurus Sunnah</b> memakai teks
            share di atas.
          </li>
        </ol>
      </section>
    </div>
  );
}
