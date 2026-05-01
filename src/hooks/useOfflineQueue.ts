import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNetworkStatus } from "./useNetworkStatus";

const DB_NAME = "aegis-offline";
const STORE = "alert-queue";
const VERSION = 1;

interface QueuedAlert {
  id?: number;
  user_id: string;
  sensor_type: string;
  severity: string;
  message: string;
  value: number | null;
  queued_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(alert: QueuedAlert) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(alert);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readAll(): Promise<QueuedAlert[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAlert[]);
    req.onerror = () => reject(req.error);
  });
}

async function removeIds(ids: number[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueSize(): Promise<number> {
  try {
    const items = await readAll();
    return items.length;
  } catch {
    return 0;
  }
}

export function useOfflineQueue(user: User | null) {
  const online = useNetworkStatus();
  const syncing = useRef(false);

  const queueAlert = useCallback(
    async (alert: { sensor_type: string; severity: string; message: string; value?: number }) => {
      if (!user) return;
      const payload: QueuedAlert = {
        user_id: user.id,
        sensor_type: alert.sensor_type,
        severity: alert.severity,
        message: alert.message,
        value: alert.value ?? null,
        queued_at: new Date().toISOString(),
      };

      if (online) {
        const { error } = await supabase.from("alert_history").insert({
          user_id: payload.user_id,
          sensor_type: payload.sensor_type,
          severity: payload.severity,
          message: payload.message,
          value: payload.value,
        });
        if (error) await enqueue(payload);
      } else {
        await enqueue(payload);
      }
    },
    [user, online]
  );

  const syncQueue = useCallback(async () => {
    if (!user || !online || syncing.current) return;
    syncing.current = true;
    try {
      const items = await readAll();
      const mine = items.filter((i) => i.user_id === user.id && i.id !== undefined);
      if (mine.length === 0) return;

      const { error } = await supabase.from("alert_history").insert(
        mine.map((i) => ({
          user_id: i.user_id,
          sensor_type: i.sensor_type,
          severity: i.severity,
          message: `[synced] ${i.message}`,
          value: i.value,
        }))
      );
      if (!error) await removeIds(mine.map((i) => i.id!));
    } finally {
      syncing.current = false;
    }
  }, [user, online]);

  useEffect(() => {
    if (online && user) syncQueue();
  }, [online, user, syncQueue]);

  return { queueAlert, syncQueue, online };
}
