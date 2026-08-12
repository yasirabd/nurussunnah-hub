export function featureAccessRedirect(status) {
  switch (status) {
    case "unauthenticated":
      return "/auth/login";
    case "missing_profile":
      return "/auth/logout";
    case "password_change_required":
      return "/dashboard/change-password";
    case "allowed":
      return null;
    default:
      throw new Error(`Unknown feature access status: ${status}`);
  }
}

export function passwordChangeAccessRedirect(status) {
  switch (status) {
    case "unauthenticated":
      return "/auth/login";
    case "missing_profile":
      return "/auth/logout";
    case "password_change_required":
      return null;
    case "allowed":
      return "/dashboard";
    default:
      throw new Error(`Unknown feature access status: ${status}`);
  }
}
