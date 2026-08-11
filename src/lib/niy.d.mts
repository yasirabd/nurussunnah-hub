export const NIY_FIXED_PREFIX_LENGTH: number;

export type AcademicYearRange = {
  id: string;
  start_date: string;
  end_date: string;
};

export function birthPart(birthDateISO: string): string;
export function joinPart(joinDateISO: string): string;
export function genderPart(gender: string): string;
export function sequenceOf(niy: unknown): number | null;
export function nextSequence(existingNiys: unknown[]): number;
export function buildNiy(input: {
  birthDateISO: string;
  joinDateISO: string;
  gender: string;
  sequence: unknown;
}): {
  niy: string;
  parts: { birth: string; join: string; gender: string; sequence: string };
  missing: string[];
};
export function academicYearForDate(
  dateISO: string,
  academicYears: AcademicYearRange[],
): { id: string; startYear: number } | { error: string };
export function parseMagangNiy(value: unknown): { year: number; sequence: number; niy: string } | null;
export function buildMagangNiy(startYear: number, sequence: number): string;
export function nextMagangSequence(existingNiys: unknown[], startYear: number): number;
export function validateManualMagangNiy(
  value: unknown,
  startYear: number,
): { niy: string } | { error: string };
