import type { SlotId } from './slot-sizes.mjs';

interface SignatureSlot {
  src: string;
  zoom: number;
  posX: number;
  posY: number;
}

export function slideSignature(input: {
  area: string;
  unit: string;
  slots: Partial<Record<SlotId, SignatureSlot>>;
}): string;
