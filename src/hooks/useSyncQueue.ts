// hooks/useSyncQueue.ts
import { useState, useEffect, useCallback } from "react";
import { getStats, onQueueChange, processQueue } from "../lib/syncEngine";
import type { SyncStats } from "../types/sync";

const EMPTY_STATS: SyncStats = {
  pendingCount: 0,
  syncingCount: 0,
  failedCount: 0,
  syncedCount: 0,
  lastSyncedAt: null,
};

export function useSyncQueue() {
  const [stats, setStats] = useState<SyncStats>(EMPTY_STATS);

  const refresh = useCallback(() => {
    void getStats().then(setStats);
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onQueueChange(refresh);
    return unsubscribe;
  }, [refresh]);

  const triggerSync = useCallback(() => {
    void processQueue();
  }, []);

  return { stats, triggerSync, isSyncing: stats.syncingCount > 0 };
}