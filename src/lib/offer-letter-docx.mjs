import JSZip from "jszip";

export const OFFER_LETTER_FIELDS = [
  { name: "honorific", label: "Sapaan", required: true, type: "select", options: ["ustadz", "ustadzah"], section: "candidate", help: "Pilih sapaan sesuai jenis kelamin kandidat." },
  { name: "candidate_name", label: "Nama Kandidat", required: true, type: "text", section: "candidate", placeholder: "Contoh: Ahmad Fauzi" },
  { name: "position_name", label: "Posisi", required: true, type: "text", section: "candidate", placeholder: "Contoh: Guru Tahfizh" },
  { name: "unit_name", label: "Unit Penempatan", required: true, type: "text", section: "candidate", placeholder: "Contoh: SMP Nurussunnah" },
  { name: "start_date", label: "Tanggal Mulai", required: true, type: "date", section: "employment" },
  { name: "employment_status", label: "Status Kerja", required: true, type: "text", section: "employment", placeholder: "Contoh: Kontrak / Tetap" },
  { name: "contract_period", label: "Masa Kontrak Kerja", required: true, type: "text", section: "employment", placeholder: "Contoh: 12 bulan" },
  { name: "basic_salary", label: "Gaji Pokok", required: true, type: "currency", section: "compensation" },
  { name: "fixed_allowance", label: "Tunjangan Tetap", required: true, type: "currency", section: "compensation" },
  { name: "take_home_pay", label: "Take Home Pay", required: true, type: "currency", section: "compensation", help: "Terisi otomatis dari gaji pokok + tunjangan, dapat diubah." },
  { name: "benefits", label: "Fasilitas dan Benefit", required: true, type: "textarea", section: "compensation", placeholder: "Contoh: BPJS Kesehatan, BPJS Ketenagakerjaan, tunjangan hari raya" },
  { name: "letter_date", label: "Tanggal Surat", required: true, type: "date", section: "letter" },
  { name: "offer_expiry_date", label: "Tanggal Batas Konfirmasi", required: true, type: "date", section: "letter", help: "Batas akhir kandidat mengonfirmasi penawaran." },
];

export const OFFER_LETTER_SECTIONS = [
  { id: "candidate", title: "Data Kandidat", description: "Identitas dan posisi yang ditawarkan." },
  { id: "employment", title: "Detail Pekerjaan", description: "Status, masa kontrak, dan tanggal mulai." },
  { id: "compensation", title: "Kompensasi & Benefit", description: "Gaji, tunjangan, dan fasilitas." },
  { id: "letter", title: "Informasi Surat", description: "Tanggal surat dan batas konfirmasi." },
];

const REQUIRED_FIELDS = OFFER_LETTER_FIELDS.filter((field) => field.required).map((field) => field.name);
const CURRENCY_FIELDS = new Set(["basic_salary", "fixed_allowance", "take_home_pay"]);
const DATE_FIELDS = new Set(["start_date", "offer_expiry_date", "letter_date"]);
const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const TEMPLATE_PLACEHOLDERS = {
  honorific: ["ustadz/ustadzah"],
};

export function normalizeOfferLetterPayload(formData) {
  const values = {};
  for (const field of OFFER_LETTER_FIELDS) {
    const rawValue = String(formData.get(field.name) ?? "").trim();
    values[field.name] = normalizeFieldValue(field.name, rawValue);
  }

  const missing = REQUIRED_FIELDS.filter((field) => !values[field]);
  if (missing.length) return { ok: false, missing, values };

  return { ok: true, values };
}

function normalizeFieldValue(fieldName, value) {
  if (CURRENCY_FIELDS.has(fieldName)) return formatCurrency(value);
  if (DATE_FIELDS.has(fieldName)) return formatIndonesianDate(value);
  return value;
}

export async function generateOfferLetterDocx(templateBytes, values) {
  const zip = await JSZip.loadAsync(templateBytes);
  const replacements = buildReplacements(values);

  const xmlFiles = Object.keys(zip.files).filter((name) => name.startsWith("word/") && name.endsWith(".xml"));
  for (const fileName of xmlFiles) {
    const file = zip.file(fileName);
    if (!file) continue;
    let xml = await file.async("string");
    xml = joinSplitPlaceholders(xml);
    for (const [placeholder, value] of Object.entries(replacements)) {
      xml = xml.split(placeholder).join(escapeXml(value));
    }
    zip.file(fileName, xml);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function joinSplitPlaceholders(xml) {
  return xml.replace(/\{\{(?:(?!\}\})[\s\S])*?\}\}/g, (match) => {
    const text = match.replace(/<[^>]+>/g, "");
    return text.includes("{{") && text.includes("}}") ? text : match;
  });
}

function buildReplacements(values) {
  const replacements = {};
  for (const field of OFFER_LETTER_FIELDS) {
    const placeholderNames = TEMPLATE_PLACEHOLDERS[field.name] ?? [field.name];
    for (const placeholderName of placeholderNames) {
      replacements[`{{${placeholderName}}}`] = values[field.name] || "";
    }
  }
  return replacements;
}

function formatCurrency(value) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function formatIndonesianDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;

  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex >= INDONESIAN_MONTHS.length) return value;

  return `${Number(match[3])} ${INDONESIAN_MONTHS[monthIndex]} ${match[1]}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
