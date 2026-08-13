const MAX_SEGMENT = 32

function slugify(value) {
  const cleaned = String(value ?? '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (cleaned.length <= MAX_SEGMENT) return cleaned
  return cleaned.slice(0, MAX_SEGMENT).replace(/-+$/g, '')
}

export function slideFileName({ unit, area, slide }) {
  return `Kebersihan-2026_${slugify(unit)}_${slugify(area)}_Slide-${slide}.jpg`
}
