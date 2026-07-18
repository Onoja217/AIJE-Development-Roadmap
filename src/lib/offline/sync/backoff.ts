// src/lib/offline/sync/backoff.ts
//
// Computes retry delays using exponential backoff with jitter.
//
// WHAT IT IS: each successive retry waits roughly double the previous
// delay (1s, 2s, 4s, 8s, ...), capped at a maximum, plus a small random
// jitter added on top.
//
// WHY IT'S RIGHT HERE: this app can have many devices reconnecting to the
// network at the same moment (e.g. a cell tower coming back up after an
// outage across a whole village). Without jitter, every device retrying
// on the exact same fixed schedule creates a "thundering herd" — a burst
// of simultaneous requests that can overwhelm the sync endpoint right
// when it's most needed. Jitter spreads that burst out over a window
// instead of a single instant. Exponential growth (vs a fixed retry
// interval) also backs off faster from a genuinely struggling server,
// reducing wasted requests during an extended outage.
//
// LIMITATION: pure exponential backoff can still make a device wait
// unnecessarily long after the network is clearly back (e.g. if it failed
// 5 times over a bad connection, then connectivity fully recovers) — this
// is mitigated by connectivity.ts triggering an immediate sync attempt on
// a verified "online" transition, independent of the backoff schedule.

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;
const JITTER_FACTOR = 0.3; // +/- 30% randomization

/**
 * Computes the delay before the next retry attempt, given how many
 * attempts have already been made. O(1).
 */
export function computeBackoffDelay(retryCount: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, retryCount);
  const capped = Math.min(exponential, MAX_DELAY_MS);

  const jitterRange = capped * JITTER_FACTOR;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // uniform in [-jitterRange, +jitterRange]

  return Math.max(0, Math.round(capped + jitter));
}

/**
 * Given the timestamp of the last attempt and how many attempts have been
 * made, returns whether enough time has elapsed to retry now. Used by
 * syncQueue to skip reports still within their backoff window rather than
 * hammering a report that just failed moments ago.
 */
export function isReadyForRetry(lastAttemptAt: string | null, retryCount: number): boolean {
  if (!lastAttemptAt) return true; // never attempted — always eligible
  const elapsed = Date.now() - new Date(lastAttemptAt).getTime();
  return elapsed >= computeBackoffDelay(retryCount);
}

/** Maximum attempts before a report is left in "failed" state for manual/user-visible retry rather than being retried automatically forever. */
export const MAX_AUTOMATIC_RETRIES = 6;