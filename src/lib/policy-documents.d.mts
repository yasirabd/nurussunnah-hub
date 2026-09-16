export const POLICY_BUCKET: string;
export const POLICY_MAX_BYTES: number;
export function isPolicyId(value: unknown): value is string;
export function jakartaToday(now?: Date): string;
export function validatePolicyInput(input: Record<string, unknown>): {
  title: string;
  kind: 'TATA_TERTIB' | 'SK';
  document_number: string | null;
  effective_date: string;
};
export function validatePolicyPdf(file: Blob): Promise<void>;
