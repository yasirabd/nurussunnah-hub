import { SLOT_IDS } from './slot-sizes.mjs'

/**
 * Everything the rendered slides depend on, as one comparable string.
 *
 * Exports go stale silently: change the area name after generating and the
 * JPEGs still carry the old one while the caption carries the new one. The
 * participant posts a mismatched carousel and never finds out. Comparing this
 * signature is how the app knows the exports must be thrown away.
 *
 * Member names are deliberately absent — they appear only in the caption, so
 * editing them must not force a re-render.
 */
export function slideSignature({ area, unit, slots }) {
  const parts = [`area:${area ?? ''}`, `unit:${unit ?? ''}`]

  for (const id of SLOT_IDS) {
    const slot = slots?.[id]
    parts.push(
      slot
        ? `${id}:${slot.src}:${slot.zoom}:${slot.posX}:${slot.posY}`
        : `${id}:kosong`
    )
  }

  return parts.join('|')
}
