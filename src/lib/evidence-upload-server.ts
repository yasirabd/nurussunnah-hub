import "server-only";

import { EVIDENCE_MAX_FILE_BYTES } from "@/lib/attendance-correction-upload.mjs";
import {
  detectEvidenceImageFormat,
  evidenceFormatMatchesMimeType,
} from "@/lib/evidence-file.mjs";

export class EvidenceValidationError extends Error {}

type EvidenceValidationOptions = {
  required?: boolean;
  allowedMimeTypes?: readonly string[];
};

export function validateSingleEvidenceImage(
  formData: FormData,
  key: string,
  label: string,
  options: EvidenceValidationOptions = {}
): File[] {
  const files = formData
    .getAll(key)
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length > 1) {
    throw new EvidenceValidationError(`${label} hanya boleh berisi 1 foto.`);
  }

  const file = files[0];
  if (!file) {
    if (options.required) {
      throw new EvidenceValidationError(`${label} wajib diunggah.`);
    }
    return [];
  }

  if (
    options.allowedMimeTypes &&
    !options.allowedMimeTypes.includes(file.type)
  ) {
    throw new EvidenceValidationError(
      `${label} harus berupa foto JPG, HEIC, HEIF, atau AVIF yang valid.`
    );
  }

  if (!options.allowedMimeTypes && !file.type.startsWith("image/")) {
    throw new EvidenceValidationError(`${label} harus berupa foto. PDF tidak didukung.`);
  }

  if (file.size > EVIDENCE_MAX_FILE_BYTES) {
    throw new EvidenceValidationError(
      `${label} melebihi batas 5 MB. Pilih foto yang lebih kecil.`
    );
  }

  return [file];
}

export async function validateEvidenceFileSignatures(
  files: File[],
  label: string
) {
  for (const file of files) {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const format = detectEvidenceImageFormat(bytes);
    if (!format || !evidenceFormatMatchesMimeType(format, file.type)) {
      throw new EvidenceValidationError(
        `${label} memiliki format atau tipe file yang tidak valid.`
      );
    }
  }
}
