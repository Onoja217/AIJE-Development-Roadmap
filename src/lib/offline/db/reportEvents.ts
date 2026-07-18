// src/lib/offline/db/reportEvents.ts
//
// IndexedDB has no built-in change-notification mechanism, which leaves
// two options for keeping the UI in sync with storage: poll on an
// interval, or have the repository explicitly announce when it mutates
// data. Polling wastes cycles checking for changes that usually haven't
// happened (violates the "minimize unnecessary work" performance
// requirement) and adds latency (up to one poll interval before the UI
// reflects a change). An explicit event emitter is O(1) per mutation, and
// the UI updates the instant a write actually happens — so this module
// exists purely so reportsRepository can call `emitReportsChanged()`
// after each successful write, and hooks can subscribe instead of polling.

type ReportsChangedListener = () => void;

const listeners = new Set<ReportsChangedListener>();

export function subscribeToReportsChanged(listener: ReportsChangedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitReportsChanged(): void {
  for (const listener of listeners) listener();
}