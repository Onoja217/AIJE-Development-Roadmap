// hooks/useOnlineStatus.ts
import { useState, useEffect } from "react";
import { initAutoSync } from "../lib/syncEngine";

let autoSyncInitialized = false;

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Initialize the auto-sync listener once per app lifetime, not once per
    // component instance — safe to call from multiple components.
    if (!autoSyncInitialized) {
      initAutoSync();
      autoSyncInitialized = true;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}