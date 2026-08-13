export const HASHTAGS = [
  '#LombaKebersihanNurusSunnah',
  '#BersihTempatnyaBanggaMenjaganya',
  '#NurusSunnah',
  '#HUTRI81',
  '#CerdasMandiriBerkarakterQurani',
]

const LINK_PLACEHOLDER = '(tempel link postingan di sini)'

function numberedMembers(members) {
  return (members ?? [])
    .map((name, index) => `${index + 1}. ${name}`)
    .join('\n')
}

// Warmth comes from concrete detail and short sentences, not from adjectives.
// The earlier draft opened like a press release ("Dalam semangat HUT ke-81
// Republik Indonesia, kami berikhtiar...") and recited the three values in a
// paragraph of their own, which read as institutional rather than human.
export function instagramCaption({ unit, area, members }) {
  return [
    '🇮🇩 Bersih Tempatnya, Bangga Menjaganya',
    '',
    'Hari ini kami membenahi tempat kami sendiri. Menyapu, merapikan, mengembalikan setiap barang ke tempatnya. Pekerjaan yang sederhana, tapi rasanya berbeda setelah selesai.',
    '',
    `📍 ${area}`,
    `🏫 ${unit}`,
    '',
    'Terima kasih untuk yang mengerjakannya bersama-sama:',
    numberedMembers(members),
    '',
    'Bagi kami, menjaga kebersihan bukan karena akan dinilai, tapi karena tempat ini amanah yang Allah titipkan. Semoga yang kami rawat hari ini tetap terjaga sampai seterusnya.',
    '',
    'Selamat HUT ke-81 Republik Indonesia.',
    'Indonesia Berdaulat, Adil, dan Makmur.',
    '',
    'Bersih Tempatnya, Bangga Menjaganya',
    'Cerdas • Mandiri • Berkarakter Qur’ani',
    '',
    '@nurussunnah.ig',
    '',
    HASHTAGS.join(' '),
  ].join('\n')
}

export function instagramCaptionShort({ unit, area, members }) {
  return [
    '🇮🇩 Bersih Tempatnya, Bangga Menjaganya',
    '',
    'Kami membenahi tempat kami sendiri hari ini. Sederhana, tapi rasanya berbeda setelah selesai.',
    '',
    `📍 ${area}`,
    `🏫 ${unit}`,
    '',
    'Terima kasih untuk yang mengerjakannya bersama-sama:',
    numberedMembers(members),
    '',
    'Selamat HUT ke-81 Republik Indonesia.',
    '',
    'Cerdas • Mandiri • Berkarakter Qur’ani',
    '@nurussunnah.ig',
    '',
    HASHTAGS.join(' '),
  ].join('\n')
}

// No flag here, unlike the caption. 🇮🇩 is a regional-indicator pair and Windows
// ships no country-flag glyphs, so WhatsApp Desktop renders it as the bare
// letters "ID". The caption keeps it because Instagram is read on phones; this
// is a submission form read by the PIC and judges on whatever they happen to
// use, where legibility beats decoration.
export function whatsappSubmission({ unit, area, members, link }) {
  return [
    'Lomba Kebersihan Nurus Sunnah 2026',
    '',
    `🏫 Unit: ${unit}`,
    `📍 Area: ${area}`,
    '',
    '👥 Anggota:',
    numberedMembers(members),
    '',
    '🔗 Instagram:',
    link ? link : LINK_PLACEHOLDER,
  ].join('\n')
}

/**
 * Opens WhatsApp with the message already written, letting the participant
 * pick the SI Nurus Sunnah group. Without this they have to copy the text,
 * switch apps, paste, and then edit the link placeholder inside the compose
 * box — which is where submissions get lost.
 */
export function whatsappShareUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Deliberately lenient: participants paste whatever Instagram handed them, and
 * a wrong guess here should nudge, never block.
 */
export function isLikelyInstagramLink(link) {
  const value = String(link ?? '').trim()
  if (!value) return false
  return /^(https?:\/\/)?(www\.)?instagram\.com\/\S+/i.test(value)
}
