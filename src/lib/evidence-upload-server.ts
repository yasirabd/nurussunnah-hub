import "server-only";

import { EVIDENCE_MAX_FILE_BYTES } from "@/lib/attendance-correction-upload.mjs";

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
      `${label} harus disiapkan sebagai foto JPG.`
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
