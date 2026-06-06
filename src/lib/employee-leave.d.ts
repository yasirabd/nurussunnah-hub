export type EmployeeLeavePeriod = {
  start_date: string;
  end_date: string;
  reason?: string | null;
};

export function formatDateId(date: string): string;
export function formatLeavePeriod(leave: EmployeeLeavePeriod | null | undefined): string;
export function normalizeLeavePayload(formData: FormData):
  | { data: EmployeeLeavePeriod | null; error?: never }
  | { error: string; data?: never };

export function normalizeStatusDetailPayload(formData: FormData):
  | {
      data: {
        active_status_start_date: string | null;
        active_status_end_date: string | null;
        active_status_note: string | null;
      };
      error?: never;
    }
  | { error: string; data?: never };

export function canAccessDashboard(activeStatus: string | null | undefined): boolean;
