export type OfferLetterField = {
  name:
    | "honorific"
    | "candidate_name"
    | "position_name"
    | "unit_name"
    | "start_date"
    | "employment_status"
    | "contract_period"
    | "basic_salary"
    | "fixed_allowance"
    | "take_home_pay"
    | "benefits"
    | "offer_expiry_date"
    | "letter_date";
  label: string;
  required: boolean;
  type: "text" | "textarea" | "date" | "select" | "currency";
  options?: string[];
};

export type OfferLetterValues = Record<OfferLetterField["name"], string>;

export type NormalizedOfferLetterPayload =
  | { ok: true; values: OfferLetterValues }
  | { ok: false; missing: OfferLetterField["name"][]; values: OfferLetterValues };

export const OFFER_LETTER_FIELDS: OfferLetterField[];
export function normalizeOfferLetterPayload(formData: FormData): NormalizedOfferLetterPayload;
export function generateOfferLetterDocx(
  templateBytes: Uint8Array | ArrayBuffer | Buffer,
  values: OfferLetterValues
): Promise<Uint8Array>;
