"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import { SLOT_IDS } from "@/lib/kebersihan/slot-sizes.mjs";
import { UNIT_OTHER } from "@/lib/kebersihan/units.mjs";
import { instagramCaption } from "@/lib/kebersihan/caption.mjs";
import { decodePhoto } from "@/lib/kebersihan/image-decode";
import { rasterizeSlide } from "@/lib/kebersihan/rasterize";
import { AreaForm } from "./area-form";
import { ExportActions } from "./export-actions";
import { InAppBrowserNotice } from "./in-app-browser-notice";
import type { SlotState } from "./photo-slot";
import { SlideStep } from "./slide-step";
import { SlideDetail } from "./slides/slide-detail";
import { SlideHero } from "./slides/slide-hero";
import { SlideImprovement } from "./slides/slide-improvement";
import { SlideWide } from "./slides/slide-wide";

type Slots = Partial<Record<SlotId, SlotState>>;

const STEPS = [
  "Bersihkan dan tata area kerja Anda.",
  "Foto areanya, lalu isi data dan unggah fotonya di halaman ini.",
  "Simpan 4 slide yang dihasilkan, lalu salin captionnya.",
  "Unggah ke Instagram sebagai satu carousel, lalu bagikan linknya.",
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
  const resultRef = useRef<HTMLDivElement>(null);
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

  const photosDone = SLOT_IDS.filter((id) => slots[id]).length;
  const identityDone =
    Boolean(resolvedUnit) && Boolean(cleanArea) && cleanMembers.length > 0;
  const ready = identityDone && SLOT_IDS.every((id) => slots[id]);

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

  function updateSlot(id: SlotId, next: SlotState) {
    setSlots((current) => ({ ...current, [id]: next }));
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
      toast.success("4 slide siap disimpan.");
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
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

  const slideProps = { areaName: previewArea, unitName: previewUnit };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 px-4 pt-10 pb-32">
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
        <p className="text-base font-medium">Sabtu, 15 Agustus 2026</p>
        <p className="text-lg font-semibold">
          Bersih Tempatnya, Bangga Menjaganya
        </p>
        <p className="text-base text-muted-foreground">
          Cerdas • Mandiri • Berkarakter Qur’ani
        </p>
        <a
          href="#mulai"
          className="ks-press inline-flex min-h-14 items-center rounded-xl bg-primary px-8 text-lg font-semibold text-primary-foreground"
        >
          Mulai Buat Carousel
        </a>
      </header>

      <InAppBrowserNotice />

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Cara Mengikuti</h2>
        <ol className="mt-3 space-y-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-base leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="mulai" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">1. Data Area Anda</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Nama area dan unit akan tercetak di setiap slide.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
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
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">2. Unggah Foto</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Setiap foto yang Anda unggah langsung terlihat hasilnya di bawahnya.
          </p>
          <p className="mt-2 rounded-lg bg-secondary p-3 text-base">
            Foto diproses di HP Anda dan tidak diunggah ke server.
          </p>
        </div>

        <SlideStep
          number={1}
          total={4}
          slots={["hero"]}
          states={slots}
          onPick={pickPhoto}
          onChange={updateSlot}
          nodeRef={(node) => {
            slideNodes.current[0] = node;
          }}
        >
          <SlideHero {...slideProps} hero={slots.hero ?? null} />
        </SlideStep>

        <SlideStep
          number={2}
          total={4}
          slots={["wide"]}
          states={slots}
          onPick={pickPhoto}
          onChange={updateSlot}
          nodeRef={(node) => {
            slideNodes.current[1] = node;
          }}
        >
          <SlideWide {...slideProps} wide={slots.wide ?? null} />
        </SlideStep>

        <SlideStep
          number={3}
          total={4}
          slots={["detail"]}
          states={slots}
          onPick={pickPhoto}
          onChange={updateSlot}
          nodeRef={(node) => {
            slideNodes.current[2] = node;
          }}
        >
          <SlideDetail {...slideProps} detail={slots.detail ?? null} />
        </SlideStep>

        <SlideStep
          number={4}
          total={4}
          slots={["before", "after"]}
          states={slots}
          onPick={pickPhoto}
          onChange={updateSlot}
          nodeRef={(node) => {
            slideNodes.current[3] = node;
          }}
        >
          <SlideImprovement
            {...slideProps}
            before={slots.before ?? null}
            after={slots.after ?? null}
          />
        </SlideStep>
      </section>

      <div ref={resultRef} className="scroll-mt-4">
        {blobs.length === 4 ? (
          <div className="ks-reveal">
            <ExportActions
              blobs={blobs}
              unit={resolvedUnit}
              area={cleanArea}
              members={cleanMembers}
              caption={caption}
              startStep={3}
            />
          </div>
        ) : null}
      </div>

      {/* Always-visible next action. On a long form the primary button is
          otherwise off-screen most of the time, and the count answers the only
          question the participant has: what is still missing? */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="button"
            onClick={generate}
            disabled={!ready || busy}
            className="ks-press min-h-14 w-full rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Sedang membuat slide…" : "Buat 4 Slide"}
          </button>
          {!ready ? (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {!identityDone
                ? "Lengkapi unit, nama area, dan anggota dulu."
                : `Kurang ${5 - photosDone} foto lagi.`}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
