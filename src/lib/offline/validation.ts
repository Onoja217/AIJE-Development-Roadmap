// src/lib/offline/validation.ts
//
// Re-validates a report at the storage boundary, independent of the
// form's zod schema (lib/reportSchema.ts). The form's validation only
// protects the one call site (user typing into the form) — this module
// protects the repository itself, which could in principle be called
// from other places later (e.g. a bulk-import feature, a background
// migration script) that never went through the form. "Never trust a
// caller validated correctly upstream" is the operating assumption.

import { EMERGENCY_CATEGORY_IDS, type EmergencyCategoryId } from "../config/emergencyCategories";
import type { EmergencyReport, StoredEmergencyReport } from "../../types/report";

export class ValidationFailedError extends Error {
  constructor(message: string, public readonly fields: string[]) {
    super(message);
    this.name = "ValidationFailedError";
  }
}

function isValidCategory(value: unknown): value is EmergencyCategoryId {
  return typeof value === "string" && (EMERGENCY_CATEGORY_IDS as readonly string[]).includes(value);
}

/**
 * Structural check on a value claiming to be an EmergencyReport, run
 * before it's ever written to IndexedDB. Runs in O(1) with respect to
 * report count (fixed number of field checks) and O(m) in number of
 * attached images (m <= 5, so effectively bounded/constant).
 */
export function assertValidEmergencyReport(raw: unknown): EmergencyReport {
  const fields: string[] = [];

  if (raw === null || typeof raw !== "object") {
    throw new ValidationFailedError("Report must be a non-null object.", ["_root"]);
  }
  const r = raw as Partial<EmergencyReport>;

  if (typeof r.id !== "string" || r.id.length === 0) fields.push("id");
  if (typeof r.title !== "string" || r.title.trim().length === 0) fields.push("title");
  if (!isValidCategory(r.category)) fields.push("category");
  if (typeof r.description !== "string" || r.description.trim().length === 0) fields.push("description");
  if (typeof r.timestamp !== "string" || Number.isNaN(Date.parse(r.timestamp))) fields.push("timestamp");
  if (typeof r.location !== "object" || r.location === null) fields.push("location");
  if (!Array.isArray(r.images) || r.images.length > 5) fields.push("images");
  if (typeof r.syncStatus !== "string") fields.push("syncStatus");

  if (fields.length > 0) {
    throw new ValidationFailedError(`Invalid report: ${fields.join(", ")}`, fields);
  }

  return raw as EmergencyReport;
}

/**
 * Checks a value read back OUT of IndexedDB is still structurally sound.
 * Used defensively on reads to guard against corruption (e.g. a browser
 * crash mid-write leaving a partially-applied record, or a future schema
 * migration that missed backfilling a field). A corrupted record is
 * skipped by the caller rather than crashing the whole read — see
 * db/reportsRepository.ts.
 */
export function isStructurallyValidStoredReport(raw: unknown): raw is StoredEmergencyReport {
  if (raw === null || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;

  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.title === "string" &&
    isValidCategory(r.category) &&
    typeof r.description === "string" &&
    typeof r.timestamp === "string" &&
    typeof r.syncStatus === "string" &&
    typeof r.clientVersion === "number" &&
    typeof r.retryCount === "number" &&
    Array.isArray(r.images)
  );
}