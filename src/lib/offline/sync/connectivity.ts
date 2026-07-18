// src/lib/offline/sync/connectivity.ts
//
// Detects connectivity changes and exposes them via a subscribe pattern,
// so the sync engine can react ("connection restored -> attempt sync")
// without polling.
//
// WHY NOT JUST navigator.onLine ALONE: navigator.onLine is notoriously
// unreliable — it reports whether the device has *a* network interface
// up, not whether it can actually reach our server (e.g. connected to
// wifi with no internet, or a captive portal). We treat it as a fast,
// free first signal (skip attempting sync entirely if it says offline —
// no point trying), but back it with a lightweight reachability check
// before actually declaring "online" to the rest of the app, to avoid
// firing off a batch of sync attempts that will just fail.

type ConnectivityListener = (isOnline: boolean) => void;

const listeners = new Set<ConnectivityListener>();
let currentlyOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * A lightweight reachability probe. HEAD request to a same-origin
 * endpoint (falls back to a well-known public endpoint if unset) with a
 * short timeout — cheap enough to run on every online transition without
 * being a meaningful burden on a weak connection.
 */
async function probeReachability(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // A HEAD request to the current origin's favicon is a reasonable
    // zero-config default: same-origin (no CORS issues), tiny, and
    // present on virtually every deployed web app. Projects can swap this
    // for a dedicated /health endpoint if one exists.
    const response = await fetch("/favicon.ico", { method: "HEAD", cache: "no-store", signal: controller.signal });
    return response.ok || response.status === 304;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function notifyListeners(isOnline: boolean) {
  if (isOnline === currentlyOnline) return; // no-op on redundant events, avoids spurious sync attempts
  currentlyOnline = isOnline;
  for (const listener of listeners) listener(isOnline);
}

async function handleBrowserOnlineEvent() {
  // Browser says a network interface came up — verify actual reachability
  // before trusting it, per the rationale above.
  const reachable = await probeReachability();
  notifyListeners(reachable);
}

function handleBrowserOfflineEvent() {
  // The browser's own "offline" event is trustworthy for the negative
  // case (no interface at all) — no need to probe to confirm "not online".
  notifyListeners(false);
}

let initialized = false;
function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("online", handleBrowserOnlineEvent);
  window.addEventListener("offline", handleBrowserOfflineEvent);
}

/** Returns the last-known connectivity state without performing a new probe. */
export function isOnline(): boolean {
  ensureInitialized();
  return currentlyOnline;
}

/**
 * Subscribes to connectivity transitions. Returns an unsubscribe
 * function — callers (e.g. useSyncEngine on unmount) must call it to
 * avoid leaking listeners across component remounts.
 */
export function subscribeToConnectivity(listener: ConnectivityListener): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forces an immediate reachability probe, e.g. for a manual "retry now" button in the UI. */
export async function checkConnectivityNow(): Promise<boolean> {
  ensureInitialized();
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    notifyListeners(false);
    return false;
  }
  const reachable = await probeReachability();
  notifyListeners(reachable);
  return reachable;
}