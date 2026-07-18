// src/hooks/useOfflineStatus.ts
//
// Thin React binding over lib/offline/sync/connectivity.ts. Kept
// deliberately minimal — all the actual detection logic (the
// navigator.onLine + reachability-probe distinction) lives in
// connectivity.ts, which has no React dependency and is independently
// testable. This hook's only job is bridging that module's subscribe
// pattern into React state.

import { useEffect, useState } from "react";
import { isOnline, subscribeToConnectivity } from "../lib/offline/sync/connectivity";

export interface UseOfflineStatusResult {
  isOnline: boolean;
  isOffline: boolean;
}

export function useOfflineStatus(): UseOfflineStatusResult {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => {
    // Re-sync in case connectivity changed between initial render and
    // this effect running (unlikely, but cheap to guard against).
    setOnline(isOnline());
    return subscribeToConnectivity(setOnline);
  }, []);

  return { isOnline: online, isOffline: !online };
}