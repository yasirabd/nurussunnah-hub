export const EVIDENCE_OPTIMIZE_THRESHOLD_BYTES = 1_000_000;
export const EVIDENCE_MAX_DIMENSION = 1600;
export const EVIDENCE_MAX_TOTAL_BYTES = 10_000_000;
export const EVIDENCE_MAX_FILE_BYTES = 5_000_000;

const EVIDENCE_COMPRESSION_STEPS = [
  { maxDimension: 2560, quality: 0.9 },
  { maxDimension: 2200, quality: 0.86 },
  { maxDimension: 1920, quality: 0.82 },
  { maxDimension: 1600, quality: 0.78 },
  { maxDimension: 1280, quality: 0.72 },
  { maxDimension: 1024, quality: 0.65 },
  { maxDimension: 800, quality: 0.58 },
];

export function shouldOptimizeEvidenceFile(type, size) {
  return type.startsWith("image/") && size > EVIDENCE_OPTIMIZE_THRESHOLD_BYTES;
}

export function fitEvidenceImage(width, height, maxDimension = EVIDENCE_MAX_DIMENSION) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };

  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export function isEvidenceFileWithinLimit(
  size,
  maxBytes = EVIDENCE_MAX_FILE_BYTES
) {
  return size <= maxBytes;
}

export function evidenceCompressionAttempts(width, height) {
  return EVIDENCE_COMPRESSION_STEPS.map(({ maxDimension, quality }) => ({
    ...fitEvidenceImage(width, height, maxDimension),
    quality,
  }));
}
