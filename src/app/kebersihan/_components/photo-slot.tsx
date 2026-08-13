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

      {state ? (
        <div className="ks-reveal mt-4 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold">Atur posisi foto</p>
            <button
              type="button"
              onClick={() => onChange({ ...state, zoom: 1, posX: 50, posY: 50 })}
              disabled={isDefaultCrop(state)}
              className="ks-press min-h-11 shrink-0 rounded-lg border-2 border-border bg-card px-3 text-base font-medium disabled:opacity-40"
            >
              Atur Ulang
            </button>
          </div>

          <div className="mt-2 divide-y divide-border">
            <Slider
              label="Perbesar"
              value={state.zoom}
              display={`${Math.round(state.zoom * 100)}%`}
              min={1}
              max={2.5}
              step={0.01}
              onChange={(zoom) => onChange({ ...state, zoom })}
            />
            <Slider
              label="Geser kiri atau kanan"
              value={state.posX}
              min={0}
              max={100}
              step={1}
              disabled={!axes.x}
              onChange={(posX) => onChange({ ...state, posX })}
            />
            <Slider
              label="Geser atas atau bawah"
              value={state.posY}
              min={0}
              max={100}
              step={1}
              disabled={!axes.y}
              onChange={(posY) => onChange({ ...state, posY })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function isDefaultCrop(state: SlotState) {
  return state.zoom === 1 && state.posX === 50 && state.posY === 50;
}

function Slider({
  label,
  display,
  min,
  max,
  step,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  display?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`block py-1 ${disabled ? "opacity-50" : ""}`}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-base">{label}</span>
        <span className="text-base tabular-nums text-muted-foreground">
          {disabled ? "sudah pas" : display}
        </span>
      </span>
      <input
        type="range"
        className="ks-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
