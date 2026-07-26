export const EVIDENCE_OPTIMIZE_THRESHOLD_BYTES = 1_000_000;
export const EVIDENCE_MAX_DIMENSION = 1600;
export const EVIDENCE_MAX_TOTAL_BYTES = 10_000_000;

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
