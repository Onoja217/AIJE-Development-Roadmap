// Shared validation for user-supplied incident type strings.
// Incident types are free-text categories (e.g. "fire", "flood", "armed attack"),
// but they must never be interpolated into PostgREST filter expressions.
// This module enforces a strict character allow-list so the value can only ever
// be used as plain data.

export const INCIDENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9 _-]{0,59}$/;

/** Normalises and validates an incident type. Returns null when invalid. */
export function normalizeIncidentType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!INCIDENT_TYPE_PATTERN.test(normalized)) return null;
  return normalized;
}

/**
 * Safely decides whether a contact should receive an alert for the incident type.
 * Contacts with an empty incident_types list act as catch-all recipients.
 * Matching happens in application code so no user input reaches the query layer.
 */
export function contactMatchesIncidentType(
  incidentTypes: unknown,
  incidentType: string,
): boolean {
  if (!Array.isArray(incidentTypes) || incidentTypes.length === 0) return true;
  return incidentTypes.some(
    (t) => typeof t === "string" && t.trim().toLowerCase() === incidentType,
  );
}
