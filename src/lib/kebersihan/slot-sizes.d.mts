export type SlotId = 'hero' | 'wide' | 'detail' | 'before' | 'after';

export const SLOT_IDS: SlotId[];

export const SLOT_SIZES: Record<SlotId, { width: number; height: number }>;

export const SLOT_LABELS: Record<SlotId, string>;

export const SLOT_HINTS: Record<SlotId, string>;
