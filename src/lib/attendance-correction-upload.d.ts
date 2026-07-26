export const EVIDENCE_OPTIMIZE_THRESHOLD_BYTES: number;
export const EVIDENCE_MAX_DIMENSION: number;
export const EVIDENCE_MAX_TOTAL_BYTES: number;

export function shouldOptimizeEvidenceFile(type: string, size: number): boolean;
export function fitEvidenceImage(
  width: number,
  height: number,
  maxDimension?: number
): { width: number; height: number };
