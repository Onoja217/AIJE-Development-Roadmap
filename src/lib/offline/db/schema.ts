// src/lib/offline/db/schema.ts
//
// IndexedDB object store layout for locally-persisted emergency reports.
// See the equivalent comment in database.ts for why IndexedDB (vs
// localStorage) is the right tool here — in short: transactional writes
// (a crash mid-save can't corrupt the whole store), indexed queries
// (O(k) "give me all pending reports" instead of O(n) scan-and-filter),
// async (doesn't block the UI thread), and a much larger storage quota
// than localStorage's ~5-10MB — needed here specifically because reports
// carry compressed image Blobs, which localStorage couldn't hold anyway
// (string-only, small quota).

export const DB_NAME = "aije_emergency_reports";

/**
 * Bump on any object store / index structure change. IndexedDB invokes
 * onupgradeneeded automatically when the requested version exceeds what's
 * on disk. Never decrease this number, and never mutate a shipped
 * migration step afterward — devices that already ran it won't re-run it.
 */
export const DB_VERSION = 1;

export const STORE_NAMES = {
  reports: "reports",
} as const;

export const INDEX_NAMES = {
  bySyncStatus: "by_syncStatus",
  byTimestamp: "by_timestamp",
} as const;

export function applySchemaMigrations(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const store = db.createObjectStore(STORE_NAMES.reports, { keyPath: "id" });

    // Core query for the sync engine: "all reports not yet synced".
    store.createIndex(INDEX_NAMES.bySyncStatus, "syncStatus", { unique: false });

    // Lets the UI list reports in chronological order via an index
    // cursor, without an in-memory sort after loading everything.
    store.createIndex(INDEX_NAMES.byTimestamp, "timestamp", { unique: false });
  }

  // Future migrations, e.g.:
  // if (oldVersion < 2) { ... }
}