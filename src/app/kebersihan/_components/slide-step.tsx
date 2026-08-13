"use client";

import type { ReactNode } from "react";
import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import type { SlotState } from "./photo-slot";
import { PhotoSlotControls } from "./photo-slot";
import { SlideStage } from "./slide-stage";

/**
 * One slide's worth of work: its photo pickers with the resulting slide
 * rendered directly underneath.
 *
 * Uploads used to sit in one long list and every preview lived in a separate
 * section far below, so a participant adjusting a crop could not see what it
 * did. Pairing them closes that loop — the photo lands and the finished slide
 * appears right there.
 */
export function SlideStep({
  number,
  total,
  slots,
  states,
  onPick,
  onChange,
  nodeRef,
  children,
}: {
  number: number;
  total: number;
  slots: SlotId[];
  states: Partial<Record<SlotId, SlotState>>;
  onPick: (slot: SlotId, file: File) => void;
  onChange: (slot: SlotId, next: SlotState) => void;
  nodeRef: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const filled = slots.every((id) => states[id]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="text-sm font-bold tracking-wider text-primary">
        SLIDE {number} DARI {total}
      </p>

      <div className="mt-4 space-y-7">
        {slots.map((id) => (
          <PhotoSlotControls
            key={id}
            slot={id}
            state={states[id] ?? null}
            onPick={(file) => onPick(id, file)}
            onChange={(next) => onChange(id, next)}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-3 text-base font-medium">
          {filled ? "Beginilah slide Anda nanti" : "Contoh hasil slide"}
        </p>
        <div
          className={`mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border border-border ${
            filled ? "ks-reveal" : ""
          }`}
        >
          <SlideStage nodeRef={nodeRef}>{children}</SlideStage>
        </div>
      </div>
    </section>
  );
}
