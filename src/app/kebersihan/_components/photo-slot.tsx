"use client";

import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import {
  SLOT_HINTS,
  SLOT_LABELS,
  SLOT_SIZES,
} from "@/lib/kebersihan/slot-sizes.mjs";
import { positionAxes } from "@/lib/kebersihan/crop-axes.mjs";

export type SlotState = {
  src: string;
  imgW: number;
  imgH: number;
  zoom: number;
  posX: number;
  posY: number;
};

/**
 * The render-side slot used inside the slide components. `object-fit: cover`
 * keeps the box filled and the browser clamps `object-position` at 0%-100%,
 * so an empty edge is not reachable.
 */
export function PhotoSlot({
  slot,
  state,
}: {
  slot: SlotId;
  state: SlotState | null;
}) {
  if (!state) {
    return (
      <div
        data-slot={slot}
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(11,74,43,0.08)",
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={state.src}
      alt=""
      data-slot={slot}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: `${state.posX}% ${state.posY}%`,
        transform: `scale(${state.zoom})`,
        display: "block",
      }}
    />
  );
}

/** The form-side control: pick a photo, then zoom and reposition it. */
export function PhotoSlotControls({
  slot,
  state,
  onPick,
  onChange,
}: {
  slot: SlotId;
  state: SlotState | null;
  onPick: (file: File) => void;
  onChange: (next: SlotState) => void;
}) {
  const box = SLOT_SIZES[slot];
  const axes = state
    ? positionAxes(state.imgW, state.imgH, box.width, box.height, state.zoom)
    : { x: false, y: false };
  const inputId = `foto-${slot}`;

  return (
    <div>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            state
              ? "bg-primary text-primary-foreground"
              : "border-2 border-border text-muted-foreground"
          }`}
        >
          {state ? "✓" : ""}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">
            {SLOT_LABELS[slot]}
          </h3>
          <p className="mt-1 text-base leading-snug text-muted-foreground">
            {SLOT_HINTS[slot]}
          </p>
        </div>
      </div>

      {/* The native file input is a small, browser-styled control that reads
          "Choose File" in English on most phones. A full-width label gives a
          56px target and Indonesian wording. */}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className={`ks-press mt-3 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-lg font-semibold ${
          state
            ? "border-2 border-border bg-card"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {state ? "Ganti Foto" : "Pilih Foto"}
      </label>

      {state && (axes.x || axes.y) ? (
        <div className="ks-reveal mt-4 space-y-1">
          <p className="text-base font-medium">Atur posisi foto</p>
          <Slider
            label="Perbesar"
            min={1}
            max={2.5}
            step={0.01}
            value={state.zoom}
            onChange={(zoom) => onChange({ ...state, zoom })}
          />
          {axes.x ? (
            <Slider
              label="Geser kiri atau kanan"
              min={0}
              max={100}
              step={1}
              value={state.posX}
              onChange={(posX) => onChange({ ...state, posX })}
            />
          ) : null}
          {axes.y ? (
            <Slider
              label="Geser atas atau bawah"
              min={0}
              max={100}
              step={1}
              value={state.posY}
              onChange={(posY) => onChange({ ...state, posY })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-base text-muted-foreground">
        {label}
        <input
          type="range"
          className="ks-range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
