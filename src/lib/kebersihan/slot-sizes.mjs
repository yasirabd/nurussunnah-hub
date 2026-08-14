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

// Which of the five R each photo is there to show. Naming them tells the
// participant what the judges will actually look for in that frame.
export const SLOT_PRINCIPLES = {
  hero: null,
  wide: 'Ringkas & Rapi',
  detail: 'Resik',
  before: 'Rawat & Rajin',
  after: 'Rawat & Rajin',
}

export const SLOT_HINTS = {
  hero: 'Foto terbaik area kerja Anda. Inilah yang pertama dilihat orang di Instagram.',
  wide: 'Ambil dari pintu atau sudut ruangan. Terlihat bahwa tidak ada barang menumpuk dan semuanya pada tempatnya.',
  detail: 'Dekatkan kamera ke meja, rak, label, atau sudut yang paling bersih.',
  before: 'Kondisi area sebelum dibenahi.',
  after: 'Sudut yang sama setelah dibenahi, lengkap dengan label atau checklist bila ada.',
}
