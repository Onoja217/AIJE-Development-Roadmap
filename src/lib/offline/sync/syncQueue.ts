// src/lib/offline/sync/syncQueue.ts
//
// Orchestrates the actual sync process: which reports need syncing, in
// what order, respecting each report's backoff schedule, and updating
// their status as attempts complete. This is the module useSyncEngine
// calls in response to connectivity changes / periodic ticks — it has no
// knowledge of React and no knowledge of HTTP specifics (that's
// syncClient's job), keeping orchestration logic independently testable.
//
// CONCURRENCY MODEL: reports are processed sequentially, not in parallel.
// This is a deliberate trade-off, not an oversight: this app's target
// environment is a weak/constrained connection, where a handful of
// concurrent uploads (each carrying up to 5 compressed images) would
// compete for the same limited bandwidth and likely cause every request
// to time out together, rather than a few succeeding. Sequential
// processing means the connection's full capacity goes to one report at a
// time, maximizing the chance each individual sync actually completes.
// The trade-off: total sync time for a large backlog is O(n) in wall-clock
// time rather than O(n / concurrency) — acceptable here because
// correctness and completion (not raw throughput) are what this system is
// optimized for.

import { getReportsByStatus, updateReport } from "../db/reportsRepository";
import { syncReport, outcomeToSyncStatus, type SyncOutcome } from "./syncClient";
import { isReadyForRetry, MAX_AUTOMATIC_RETRIES } from "./backoff";
import type { StoredEmergencyReport } from "../../../types/report";

export interface SyncProgress {
  totalToSync: number;
  completed: number;
  currentReportId: string | null;
  succeeded: number;
  failed: number;
  conflicts: number;
}

export type SyncProgressListener = (progress: SyncProgress) => void;

let syncInProgress = false;

/**
 * Runs one full sync pass: gathers all reports eligible to sync right
 * now (pending, or failed-but-past-their-backoff-window), attempts each
 * in turn, and persists the outcome. Safe to call repeatedly/concurrently
 * — a re-entrant call while a pass is already running is a no-op, so a
 * connectivity flap that fires multiple "online" events in quick
 * succession can't start overlapping sync passes that race on the same
 * reports.
 *
 * Returns a summary of the pass; also invokes onProgress after each
 * individual report completes, for live UI updates.
 */
export async function runSyncPass(onProgress?: SyncProgressListener): Promise<SyncProgress> {
  if (syncInProgress) {
    return { totalToSync: 0, completed: 0, currentReportId: null, succeeded: 0, failed: 0, conflicts: 0 };
  }

  syncInProgress = true;
  try {
    const [pending, failed] = await Promise.all([
      getReportsByStatus("pending"),
      getReportsByStatus("failed"),
    ]);

    const eligible = [
      ...pending,
      ...failed.filter(
        (r) => r.retryCount < MAX_AUTOMATIC_RETRIES && isReadyForRetry(r.lastSyncAttemptAt, r.retryCount)
      ),
    ];

    const progress: SyncProgress = {
      totalToSync: eligible.length,
      completed: 0,
      currentReportId: null,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
    };

    for (const report of eligible) {
      progress.currentReportId = report.id;
      onProgress?.({ ...progress });

      const outcome = await syncSingleReport(report);

      if (outcome.kind === "success") progress.succeeded++;
      else if (outcome.kind === "conflict") progress.conflicts++;
      else progress.failed++;

      progress.completed++;
      onProgress?.({ ...progress });
    }

    progress.currentReportId = null;
    return progress;
  } finally {
    syncInProgress = false;
  }
}

/**
 * Syncs one report end-to-end: marks it "syncing", attempts the upload,
 * and persists the resulting status. Isolated as its own function so it
 * can also be called directly for a user-initiated "retry this report
 * now" action outside a full pass.
 *
 * Every path through this function ends in a persisted status update —
 * there is no code path where a report is left silently stuck in
 * "syncing" if something throws, which would otherwise make it invisible
 * to both future automatic retries (which only look at "pending"/"failed")
 * and the user (whose UI would show it as perpetually "in progress").
 */
export async function syncSingleReport(report: StoredEmergencyReport): Promise<SyncOutcome> {
  await updateReport(report.id, {
    syncStatus: "syncing",
    lastSyncAttemptAt: new Date().toISOString(),
  });

  let outcome: SyncOutcome;
  try {
    outcome = await syncReport(report);
  } catch (err) {
    // syncReport is designed to catch its own failures and return an
    // "error" outcome rather than throw — this catch exists as a last
    // line of defense against a genuinely unexpected exception (e.g. a
    // bug), ensuring the report still ends up in "failed" rather than
    // stuck in "syncing" forever.
    outcome = {
      kind: "error",
      message: err instanceof Error ? err.message : "Unexpected sync error",
      retryable: true,
    };
  }

  const nextStatus = outcomeToSyncStatus(outcome);
  const uploadedImagePaths = (outcome as { uploadedImagePaths?: Record<string, string> }).uploadedImagePaths;

  if (outcome.kind === "success") {
    await updateReport(report.id, {
      syncStatus: "synced",
      serverVersion: outcome.serverVersion,
      lastError: null,
      retryCount: 0,
      ...(uploadedImagePaths ? { uploadedImagePaths } : {}),
    });
  } else if (outcome.kind === "conflict") {
    await updateReport(report.id, {
      syncStatus: "conflict",
      serverVersion: outcome.serverVersion,
      lastError: "Another device updated this report first.",
      ...(uploadedImagePaths ? { uploadedImagePaths } : {}),
    });
  } else {
    await updateReport(report.id, {
      syncStatus: nextStatus,
      lastError: outcome.message,
      retryCount: report.retryCount + 1,
      ...(uploadedImagePaths ? { uploadedImagePaths } : {}),
    });
  }

  return outcome;
}