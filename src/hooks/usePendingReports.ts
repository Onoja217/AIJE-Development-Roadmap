// src/hooks/usePendingReports.ts
//
// Exposes the live sync summary (pending count, failed count, last sync
// time, etc.) to the UI, re-fetching whenever the repository announces a
// change via reportEvents — not on a timer. This means the UI updates the
// instant a report is created, synced, or fails, with no polling delay
// and no wasted re-fetches when nothing has changed.

import { useCallback, useEffect, useState } from "react";
import { getSyncSummary } from "../lib/offline/db/reportsRepository";
import { subscribeToReportsChanged } from "../lib/offline/db/reportEvents";
import type { SyncSummary } from "../types/report";

const EMPTY_SUMMARY: SyncSummary = {
  pendingCount: 0,
  syncingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  lastSuccessfulSyncAt: null,
};

export interface UsePendingReportsResult {
  summary: SyncSummary;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePendingReports(): UsePendingReportsResult {
  const [summary, setSummary] = useState<SyncSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getSyncSummary();
      setSummary(result);
      setError(null);
    } catch (err) {
      // A failure to read the summary must not crash the status panel —
      // show the last-known summary and surface the error separately, so
      // the rest of the app (and any pending reports already saved) keeps
      // working even if this particular read fails.
      setError(err instanceof Error ? err.message : "Failed to load sync status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeToReportsChanged(load);
  }, [load]);

  return { summary, isLoading, error, refresh: load };
}