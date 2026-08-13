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

export function whatsappSubmission({ unit, area, members, link }) {
  return [
    '🇮🇩 Lomba Kebersihan Nurus Sunnah 2026',
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
