export const PREPARED_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/avif",
  "image/heic",
  "image/heic-sequence",
  "image/heif",
  "image/heif-sequence",
];

const ORIGINAL_FALLBACK_FORMATS = new Set(["avif", "heic", "heif"]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const HEIF_BRANDS = new Set(["mif1", "msf1", "heim", "heis", "hevm", "hevs"]);

function startsWith(bytes, signature) {
  return (
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  );
}

function ascii(bytes, start, length) {
  if (bytes.length < start + length) return "";
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectEvidenceImageFormat(bytes) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") {
    return "gif";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  if (ascii(bytes, 0, 2) === "BM") return "bmp";

  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
    if (HEIC_BRANDS.has(brand)) return "heic";
    if (HEIF_BRANDS.has(brand)) return "heif";
  }

  return null;
}

export function isOriginalEvidenceFallbackFormat(format) {
  return ORIGINAL_FALLBACK_FORMATS.has(format);
}

export function isPreparedEvidenceMimeType(type) {
  return PREPARED_EVIDENCE_MIME_TYPES.includes(type);
}

export function evidenceMimeTypeForFormat(format) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "avif") return "image/avif";
  if (format === "heic") return "image/heic";
  if (format === "heif") return "image/heif";
  return null;
}

export function evidenceFormatMatchesMimeType(format, type) {
  if (format === "jpeg") return type === "image/jpeg";
  if (format === "avif") return type === "image/avif";
  if (format === "heic") {
    return type === "image/heic" || type === "image/heic-sequence";
  }
  if (format === "heif") {
    return type === "image/heif" || type === "image/heif-sequence";
  }
  return false;
}

export async function prepareOriginalEvidenceFallback(file, maxFileBytes) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const format = detectEvidenceImageFormat(bytes);
  if (!isOriginalEvidenceFallbackFormat(format)) return null;

  if (maxFileBytes && file.size > maxFileBytes) {
    throw new Error(
      `Foto ${file.name} dalam format asli melebihi batas 5 MB.`
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "bukti";
  return new File([file], `${baseName}.${format}`, {
    type: evidenceMimeTypeForFormat(format) ?? undefined,
    lastModified: file.lastModified,
  });
}

export function applyPreparedEvidenceFile(formData, key, file) {
  formData.delete(key);
  if (file) formData.set(key, file);
}
