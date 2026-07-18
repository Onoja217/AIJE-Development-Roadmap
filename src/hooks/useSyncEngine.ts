// src/hooks/useSyncEngine.ts
//
// The hook that actually makes "automatic synchronization" automatic. It
// doesn't contain any sync logic itself — that all lives in
// lib/offline/sync/syncQueue.ts, which has no React dependency and is
// independently testable — this hook is purely responsible for deciding
// WHEN to call runSyncPass():
//
//   1. On mount — in case reports were queued in a previous session while
//      offline, and the app is opened again already online.
//   2. On a verified online transition — the core "detect restored
//      connectivity and upload automatically" requirement.
//   3. Whenever a report is saved/changed — so a report created while
//      already online starts syncing immediately, not after some
//      arbitrary next tick.
//   4. On a periodic interval — a fallback for reports sitting in
//      "failed" state whose backoff window has elapsed purely due to time
//      passing, with no connectivity event to trigger a re-check (e.g.
//      the app stays open on a flaky connection that never fully drops).
//
// runSyncPass() itself is re-entrant-safe (a no-op if a pass is already
// running — see syncQueue.ts), so firing it from multiple triggers in
// quick succession (e.g. an online event and a report-saved event landing
// together) is safe and doesn't risk duplicate concurrent passes.

import { useCallback, useEffect, useState } from "react";
import { runSyncPass, type SyncProgress } from "../lib/offline/sync/syncQueue";
import { subscribeToConnectivity, isOnline } from "../lib/offline/sync/connectivity";
import { subscribeToReportsChanged } from "../lib/offline/db/reportEvents";

const FALLBACK_CHECK_INTERVAL_MS = 30_000;

export interface UseSyncEngineResult {
  progress: SyncProgress | null;
  isSyncing: boolean;
  /** Manually trigger a sync pass now, e.g. for a "retry now" button. */
  syncNow: () => void;
}

export function useSyncEngine(): UseSyncEngineResult {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = useCallback(() => {
    if (!isOnline()) return; // no point attempting — connectivity.ts already backs this with a reachability probe, not just navigator.onLine
    setIsSyncing(true);
    runSyncPass((p) => setProgress(p))
      .catch((err) => {
        // runSyncPass/syncSingleReport are designed to catch their own
        // failures per-report and never throw out of the pass — this
        // catch is a last-resort guard so an unexpected bug here can
        // never surface as an unhandled promise rejection.
        // eslint-disable-next-line no-console
        console.error("Unexpected error during sync pass:", err);
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }, []);

  useEffect(() => {
    syncNow(); // trigger 1: on mount

    const unsubscribeConnectivity = subscribeToConnectivity((online) => {
      if (online) syncNow(); // trigger 2: connectivity restored
    });

    const unsubscribeReports = subscribeToReportsChanged(() => {
      syncNow(); // trigger 3: a report was created/updated
    });

    const intervalId = setInterval(() => {
      syncNow(); // trigger 4: periodic backoff-window fallback check
    }, FALLBACK_CHECK_INTERVAL_MS);

    return () => {
      unsubscribeConnectivity();
      unsubscribeReports();
      clearInterval(intervalId);
    };
  }, [syncNow]);

  return { progress, isSyncing, syncNow };
}