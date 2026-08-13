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

export function instagramCaption({ unit, area, members }) {
  return [
    '🇮🇩 Bersih Tempatnya, Bangga Menjaganya',
    '',
    'Dalam semangat HUT ke-81 Republik Indonesia, kami berikhtiar menjaga tempat kami bekerja dan berkhidmat agar tetap bersih, rapi, nyaman, dan terawat.',
    '',
    `📍 Area: ${area}`,
    `🏫 Unit: ${unit}`,
    '',
    'Anggota area:',
    numberedMembers(members),
    '',
    'Di Nurus Sunnah, kami belajar untuk cerdas dalam menata, mandiri dalam menjaga, dan menjadikan kebersihan sebagai bagian dari amanah dalam berkhidmat.',
    '',
    'Karena rasa memiliki tidak cukup hanya diucapkan. Ia terlihat dari bagaimana kita menjaga tempat yang telah Allah amanahkan kepada kita.',
    '',
    'Bersih Tempatnya, Bangga Menjaganya.',
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
    `📍 Area: ${area}`,
    `🏫 Unit: ${unit}`,
    '',
    'Anggota area:',
    numberedMembers(members),
    '',
    'Cerdas • Mandiri • Berkarakter Qur’ani',
    '',
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
