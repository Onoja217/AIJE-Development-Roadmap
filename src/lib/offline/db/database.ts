// src/lib/offline/db/database.ts
//
// Wraps the native IndexedDB connection lifecycle (event-based:
// onsuccess/onerror/onupgradeneeded) in Promises, and exposes one shared
// connection for the whole app. A single long-lived connection avoids
// both the overhead of reopening per-operation and a real correctness
// hazard: opening multiple connections while a schema migration needs to
// run can deadlock (the migration waits for other connections to close,
// which they never do if the app keeps opening new ones).

import { applySchemaMigrations, DB_NAME, DB_VERSION } from "./schema";

let connectionPromise: Promise<IDBDatabase> | null = null;

/** IndexedDB unavailable or failed to open — e.g. private/incognito mode restrictions, OS-level storage exhaustion, or an unsupported browser. Distinct from a query/write failure so the UI can show "this device can't store data locally" rather than a generic error. */
export class DatabaseUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

/**
 * Returns the shared connection, opening it on first call. Safe to call
 * concurrently: multiple simultaneous callers before the first open
 * resolves all await the same in-flight Promise instead of racing to
 * open the database multiple times.
 */
export function getDatabase(): Promise<IDBDatabase> {
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new DatabaseUnavailableError("IndexedDB is not available in this browser/context."));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(new DatabaseUnavailableError("Failed to initiate IndexedDB open request.", err));
      return;
    }

    request.onupgradeneeded = (event) => {
      applySchemaMigrations(request.result, event.oldVersion);
    };

    request.onsuccess = () => {
      const db = request.result;

      // If another tab upgrades the schema later, this connection becomes
      // stale. Close it and drop the cache so the next getDatabase() call
      // reopens against the current schema instead of operating on a
      // silently outdated one.
      db.onversionchange = () => {
        db.close();
        connectionPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(new DatabaseUnavailableError("Failed to open IndexedDB database.", request.error));
    };

    request.onblocked = () => {
      // Another tab has an older version open. Reject rather than hang
      // indefinitely, so the UI can surface a clear message instead of an
      // unexplained stall.
      reject(
        new DatabaseUnavailableError(
          "Database upgrade blocked by another open tab. Close other tabs running this app and retry."
        )
      );
    };
  });

  // Don't cache a rejected promise forever — allow retry (e.g. after the
  // user closes the tab that was blocking an upgrade).
  connectionPromise.catch(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}

export function resetConnectionForTesting(): void {
  connectionPromise = null;
}