export const ACTIVE_ORGANIZATION_KEY = "aije-active-organization";

export function getStoredActiveOrganizationId() {
  try {
    return localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
  } catch {
    return null;
  }
}
