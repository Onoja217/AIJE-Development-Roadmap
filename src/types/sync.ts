// types/sync.ts
//
// Generic types for the offline sync engine. Nothing here knows about
// "incident reports" specifically — any feature registers a "collection"
// name and gets offline storage + auto-sync for free. See lib/syncEngine.ts.

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncQueueItem<T = unknown> {
  id: string;              // client-generated UUID, doubles as idempotency key
  collection: string;      // e.g. "incident_reports", "emergency_contacts"
  data: T;
  syncStatus: SyncStatus;
  createdAt: string;       // ISO 8601
  lastAttemptAt?: string;
  retryCount: number;
  error?: string;
}

// A collection's sync handler: given the stored data, actually send it
// to the backend. Should throw on failure so the engine can retry.
export type SyncHandler<T = unknown> = (data: T, item: SyncQueueItem<T>) => Promise<void>;

export interface SyncStats {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt: string | null;
}