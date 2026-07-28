export type RegistrationApprovalData = {
  full_name: string;
  nik: string;
  phone: string;
  gender: "L" | "P";
  marital_status: string;
  birth_place: string;
  birth_date: string;
  last_education: string;
  study_program: string | null;
  address_ktp: string;
  address_domicile: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  home_unit_id: string;
  position_name: string;
  uniform_size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL";
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  note: string | null;
  join_date: string;
  employee_status: "MAGANG" | "HONORER" | "CPTY" | "PTY";
};

export function toTitleCaseName(value: unknown): string;
export function normalizeRegistrationApproval(
  formData: FormData,
): { data: RegistrationApprovalData } | { error: string };
