// lib/db.ts
//
// Requires: npm i idb
//
// One IndexedDB store ("sync_queue") holds items from every collection.
// Items are distinguished by their `collection` field, so adding a new
// feature never requires a schema/migration change here.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SyncQueueItem } from "../types/sync";

interface AIJESyncDB extends DBSchema {
  sync_queue: {
    key: string; // item.id
    value: SyncQueueItem;
    indexes: {
      "by-collection": string;
      "by-status": string;
    };
  };
}

const DB_NAME = "aije-community-shield";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AIJESyncDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AIJESyncDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AIJESyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("sync_queue", { keyPath: "id" });
        store.createIndex("by-collection", "collection");
        store.createIndex("by-status", "syncStatus");
      },
    });
  }
  return dbPromise;
}