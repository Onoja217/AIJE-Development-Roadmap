// lib/syncEngine.ts
//
// HOW TO ADD A NEW FEATURE TO OFFLINE SYNC (this is the extensibility point):
//
//   1. Pick a collection name, e.g. "emergency_contacts".
//   2. Call registerSyncHandler("emergency_contacts", async (data) => {
//        await api.createContact(data); // your real submit call
//      });
//   3. When your feature wants to save something offline-safe, call:
//        enqueue("emergency_contacts", contactData);
//
// That's it. This engine handles storage, retry, backoff, duplicate
// prevention, and auto-sync on reconnect for you — it never needs to
// change when a new feature is added.

import { getDB } from "./db";
import type { SyncHandler, SyncQueueItem, SyncStats, SyncStatus } from "../types/sync";

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000; // 2s, 4s, 8s, 16s, 32s

const handlers = new Map<string, SyncHandler>();
const listeners = new Set<() => void>();
let isProcessing = false;
let lastSyncedAt: string | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

/** Subscribe to any change in the queue (used by the useSyncQueue hook). */
export function onQueueChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Register how a given collection should actually be sent to the backend. */
export function registerSyncHandler<T>(collection: string, handler: SyncHandler<T>) {
  handlers.set(collection, handler as SyncHandler);
}

/**
 * Save an item locally and mark it pending sync. Returns the generated id.
 * Safe to call whether online or offline — if online, a sync attempt is
 * triggered right away; if offline, it just waits in the queue.
 */
export async function enqueue<T>(collection: string, data: T): Promise<string> {
  const db = await getDB();
  const item: SyncQueueItem<T> = {
    id: crypto.randomUUID(),
    collection,
    data,
    syncStatus: "pending",
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await db.put("sync_queue", item as SyncQueueItem);
  notify();

  if (navigator.onLine) {
    void processQueue();
  }

  return item.id;
}

export async function getStats(): Promise<SyncStats> {
  const db = await getDB();
  const all = await db.getAll("sync_queue");
  return {
    pendingCount: all.filter((i) => i.syncStatus === "pending").length,
    syncingCount: all.filter((i) => i.syncStatus === "syncing").length,
    failedCount: all.filter((i) => i.syncStatus === "failed").length,
    syncedCount: all.filter((i) => i.syncStatus === "synced").length,
    lastSyncedAt,
  };
}

export async function getItemsByCollection(collection: string): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("sync_queue", "by-collection", collection);
}

async function updateItemStatus(id: string, status: SyncStatus, error?: string) {
  const db = await getDB();
  const item = await db.get("sync_queue", id);
  if (!item) return;
  item.syncStatus = status;
  item.lastAttemptAt = new Date().toISOString();
  if (error) item.error = error;
  if (status === "failed") item.retryCount += 1;
  await db.put("sync_queue", item);
  notify();
}

/**
 * Process every pending item in the queue. Safe to call repeatedly —
 * it's a no-op if a sync is already in progress. Called automatically
 * on reconnect, and can be triggered manually (e.g. a "Retry now" button).
 */
export async function processQueue(): Promise<void> {
  if (isProcessing || !navigator.onLine) return;
  isProcessing = true;

  try {
    const db = await getDB();
    const pending = await db.getAllFromIndex("sync_queue", "by-status", "pending");
    const failedRetryable = (await db.getAllFromIndex("sync_queue", "by-status", "failed")).filter(
      (i) => i.retryCount < MAX_RETRIES
    );
    const toProcess = [...pending, ...failedRetryable];

    for (const item of toProcess) {
      const handler = handlers.get(item.collection);
      if (!handler) {
        // No handler registered yet for this collection — leave it pending,
        // it'll be picked up once the owning feature registers its handler.
        continue;
      }

      await updateItemStatus(item.id, "syncing");

      try {
        // Exponential backoff before retries (not before the first attempt).
        if (item.retryCount > 0) {
          const delay = BASE_BACKOFF_MS * 2 ** (item.retryCount - 1);
          await new Promise((res) => setTimeout(res, delay));
        }

        await handler(item.data, item);
        await updateItemStatus(item.id, "synced");
        lastSyncedAt = new Date().toISOString();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        await updateItemStatus(item.id, "failed", message);
      }
    }
  } finally {
    isProcessing = false;
    notify();
  }
}

/** Wire this up once at app startup (see hooks/useOnlineStatus.ts). */
export function initAutoSync() {
  window.addEventListener("online", () => {
    void processQueue();
  });
  // Also attempt on load, in case items were queued while the app was closed.
  if (navigator.onLine) {
    void processQueue();
  }
}