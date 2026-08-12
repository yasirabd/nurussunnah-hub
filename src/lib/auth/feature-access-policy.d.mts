export type FeatureAccessStatus =
  | "unauthenticated"
  | "missing_profile"
  | "password_change_required"
  | "allowed";

export function featureAccessRedirect(status: FeatureAccessStatus): string | null;
export function passwordChangeAccessRedirect(status: FeatureAccessStatus): string | null;
