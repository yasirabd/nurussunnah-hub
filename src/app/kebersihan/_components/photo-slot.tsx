"use client";

import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import { SLOT_LABELS, SLOT_SIZES } from "@/lib/kebersihan/slot-sizes.mjs";
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

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <label className="block text-sm font-medium">{SLOT_LABELS[slot]}</label>
      <input
        type="file"
        accept="image/*"
        className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />

      {state ? (
        <div className="mt-3 space-y-3">
          <div
            className="overflow-hidden rounded-md border border-border"
            style={{ aspectRatio: `${box.width} / ${box.height}` }}
          >
            <PhotoSlot slot={slot} state={state} />
          </div>

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
              label="Geser kiri–kanan"
              min={0}
              max={100}
              step={1}
              value={state.posX}
              onChange={(posX) => onChange({ ...state, posX })}
            />
          ) : null}

          {axes.y ? (
            <Slider
              label="Geser atas–bawah"
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
