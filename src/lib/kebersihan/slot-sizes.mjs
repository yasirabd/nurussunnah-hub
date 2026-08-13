export const SLOT_IDS = ['hero', 'wide', 'detail', 'before', 'after']

export const SLOT_SIZES = {
  hero: { width: 1080, height: 1350 },
  wide: { width: 1008, height: 880 },
  detail: { width: 1008, height: 880 },
  before: { width: 620, height: 440 },
  after: { width: 740, height: 450 },
}

// Plain Indonesian, no photography jargon: participants are teachers and staff
// of every age, not content creators. "Hero" and "wide view" meant nothing to
// them, so the label says what to point the camera at.
export const SLOT_LABELS = {
  hero: 'Foto Utama',
  wide: 'Seluruh Ruangan',
  detail: 'Bagian Detail',
  before: 'Sebelum Dibersihkan',
  after: 'Sesudah Dibersihkan',
}

export const SLOT_HINTS = {
  hero: 'Foto terbaik area kerja Anda. Inilah yang pertama dilihat orang di Instagram.',
  wide: 'Ambil dari pintu atau sudut ruangan, supaya lantai, meja, dan lemari terlihat semua.',
  detail: 'Dekatkan kamera ke meja, rak, label, atau sudut yang paling rapi.',
  before: 'Kondisi area sebelum dibersihkan.',
  after: 'Sudut yang sama setelah dibersihkan dan ditata.',
}
