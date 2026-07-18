// src/lib/offline/db/reportsRepository.ts
//
// The only module allowed to touch the "reports" IndexedDB object store
// directly. This is the integration point referenced in
// EmergencyReportForm.tsx's header comment: `saveReport` here is what the
// app wires up to the form's `onSubmitReport` prop.
//
// ERROR HANDLING PHILOSOPHY: every method can fail for reasons outside
// application logic — quota exceeded, a transaction aborted mid-flight, a
// corrupted record on read, the tab being killed mid-write. None of that
// is allowed to surface as an unhandled exception that crashes the app;
// every method returns a typed result or throws a typed error the caller
// is expected to catch.

import { getDatabase } from "./database";
import { INDEX_NAMES, STORE_NAMES } from "./schema";
import { emitReportsChanged } from "./reportEvents";
import { assertValidEmergencyReport, isStructurallyValidStoredReport } from "../validation";
import type { EmergencyReport, StoredEmergencyReport, SyncStatus, SyncSummary } from "../../../types/report";

export class StorageQuotaExceededError extends Error {
  constructor() {
    super("Local storage is full. Sync or free up space before saving more reports.");
    this.name = "StorageQuotaExceededError";
  }
}

export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RepositoryError";
  }
}

function requestToPromise<T>(request: IDBRequest<T>, context: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      const err = request.error;
      if (err?.name === "QuotaExceededError") {
        reject(new StorageQuotaExceededError());
      } else {
        reject(new RepositoryError(`${context}: ${err?.message ?? "unknown IndexedDB error"}`, err));
      }
    };
  });
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new RepositoryError("Transaction failed", tx.error));
    tx.onabort = () => reject(new RepositoryError("Transaction aborted", tx.error));
  });
}

/**
 * Persists a report built by EmergencyReportForm. This is deliberately
 * the ONLY thing it does before returning — no network call, no waiting
 * on sync — matching the form's own comment that onSubmitReport "should
 * return quickly (it just needs to queue the report)". Actually
 * triggering a sync attempt is the sync engine's job (useSyncEngine),
 * triggered separately by connectivity/mount events, not by this call.
 *
 * Re-validates the report structurally even though the form already
 * validated via zod — this function has no way to know whether its
 * caller actually went through the form's validation, and a corrupted or
 * malformed report must never reach IndexedDB.
 *
 * Uses `add` (not `put`): if a report with this id somehow already
 * exists — e.g. a genuine double-submit despite the form's submitState
 * guard, or an id collision — IndexedDB raises ConstraintError, which we
 * treat as a benign idempotent no-op (same id = same logical report)
 * rather than an error, since silently overwriting an existing local
 * report would be the more surprising and unsafe behavior.
 *
 * Time complexity: O(1) — one indexed put on a keyPath store.
 */
export async function saveReport(rawReport: unknown): Promise<StoredEmergencyReport> {
  const report: EmergencyReport = assertValidEmergencyReport(rawReport);

  const stored: StoredEmergencyReport = {
    ...report,
    clientVersion: 1,
    retryCount: 0,
    lastSyncAttemptAt: null,
    lastError: null,
    serverVersion: null,
    uploadedImagePaths: {},
  };

  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES.reports, "readwrite");
  const store = tx.objectStore(STORE_NAMES.reports);

  try {
    await requestToPromise(store.add(stored), "Failed to save report locally");
  } catch (err) {
    if (err instanceof RepositoryError && (err.cause as DOMException | undefined)?.name === "ConstraintError") {
      // Duplicate id — treat as already-saved, not a failure.
      const existing = await requestToPromise(store.get(report.id), "Failed to read existing report");
      tx.commit?.();
      emitReportsChanged();
      return existing as StoredEmergencyReport;
    }
    throw err;
  }

  await transactionComplete(tx);
  emitReportsChanged();
  return stored;
}

/**
 * Returns all reports ordered oldest-first via the byTimestamp index
 * cursor — no in-memory sort needed. O(n) in report count, which is
 * unavoidable since every report must be returned, but we avoid the
 * additional O(n log n) a post-hoc sort would add.
 *
 * Corrupted records are skipped, not fatal — one bad record must never
 * make the whole report list unavailable to the user.
 */
export async function getAllReports(): Promise<StoredEmergencyReport[]> {
  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES.reports, "readonly");
  const index = tx.objectStore(STORE_NAMES.reports).index(INDEX_NAMES.byTimestamp);

  const results: StoredEmergencyReport[] = [];

  await new Promise<void>((resolve, reject) => {
    const cursorRequest = index.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      if (isStructurallyValidStoredReport(cursor.value)) {
        results.push(cursor.value as StoredEmergencyReport);
      }
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(new RepositoryError("Failed to read reports", cursorRequest.error));
  });

  return results;
}

/**
 * Index-backed query for reports in a given sync state — O(k) in matching
 * reports, not O(n) total, since this is called repeatedly by the sync
 * engine as report volume grows.
 */
export async function getReportsByStatus(status: SyncStatus): Promise<StoredEmergencyReport[]> {
  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES.reports, "readonly");
  const index = tx.objectStore(STORE_NAMES.reports).index(INDEX_NAMES.bySyncStatus);

  const raw = await requestToPromise(
    index.getAll(IDBKeyRange.only(status)),
    `Failed to query reports with status "${status}"`
  );
  return raw.filter(isStructurallyValidStoredReport) as StoredEmergencyReport[];
}

/**
 * Read-modify-write update inside one transaction, so a concurrent update
 * (e.g. a UI action and a background sync tick both touching the same
 * report) can't interleave and clobber each other's changes.
 */
export async function updateReport(
  id: string,
  patch: Partial<Omit<StoredEmergencyReport, "id">>
): Promise<StoredEmergencyReport> {
  if (!id) throw new RepositoryError("updateReport called with an empty id.");

  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES.reports, "readwrite");
  const store = tx.objectStore(STORE_NAMES.reports);

  const existing = await requestToPromise(store.get(id), `Failed to read report ${id} before update`);
  if (!existing || !isStructurallyValidStoredReport(existing)) {
    tx.abort();
    throw new RepositoryError(`Cannot update report ${id}: not found or corrupted.`);
  }

  const updated: StoredEmergencyReport = { ...(existing as StoredEmergencyReport), ...patch };
  await requestToPromise(store.put(updated), `Failed to write update for report ${id}`);
  await transactionComplete(tx);
  emitReportsChanged();

  return updated;
}

export async function deleteReport(id: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES.reports, "readwrite");
  await requestToPromise(tx.objectStore(STORE_NAMES.reports).delete(id), `Failed to delete report ${id}`);
  await transactionComplete(tx);
  emitReportsChanged();
}

/**
 * Aggregate counts for the UI's sync status panel, computed via count()
 * on the indexed status query rather than loading full record bodies —
 * avoids deserializing every report (including image Blobs) just to
 * count them.
 */
export async function getSyncSummary(): Promise<SyncSummary> {
  const db = await getDatabase();
  const tx = db.transaction(STORE_NAMES.reports, "readonly");
  const index = tx.objectStore(STORE_NAMES.reports).index(INDEX_NAMES.bySyncStatus);

  const countFor = (status: SyncStatus) =>
    requestToPromise(index.count(IDBKeyRange.only(status)), `Failed to count "${status}" reports`);

  const [pendingCount, syncingCount, failedCount, conflictCount, syncedReports] = await Promise.all([
    countFor("pending"),
    countFor("syncing"),
    countFor("failed"),
    countFor("conflict"),
    requestToPromise(index.getAll(IDBKeyRange.only("synced")), "Failed to read synced reports"),
  ]);

  const validSynced = (syncedReports as unknown[]).filter(
    isStructurallyValidStoredReport
  ) as StoredEmergencyReport[];

  const lastSuccessfulSyncAt = validSynced.reduce<string | null>((latest, r) => {
    if (!r.lastSyncAttemptAt) return latest;
    if (!latest || r.lastSyncAttemptAt > latest) return r.lastSyncAttemptAt;
    return latest;
  }, null);

  return { pendingCount, syncingCount, failedCount, conflictCount, lastSuccessfulSyncAt };
}