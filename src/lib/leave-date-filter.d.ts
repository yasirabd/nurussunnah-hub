export function leaveDateFilter(searchParams: Record<string, string>, now?: Date): {
  startDate: string;
  endDate: string;
  error: string | null;
};
