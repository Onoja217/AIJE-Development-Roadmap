import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkStatus } from "./useNetworkStatus";

const DB_NAME = "aije-community-offline";
const DB_VERSION = 1;
const STORES = ["alerts", "reports", "groups", "resources", "family"] as const;

type OfflineStore = (typeof STORES)[number];

type QueueRecord<T> = {
  id?: number;
  user_id: string;
  payload: T;
  queued_at: string;
};

interface CommunityAlertPayload {
  title: string;
  message: string;
  priority: string;
  channel: string;
}

interface CommunityReportPayload {
  category: string;
  location: string;
  details: string;
  contact_phone: string;
}

interface CommunityGroupPayload {
  group_name: string;
  area: string;
  members_count: number;
  contact_phone: string;
  notes: string;
}

interface CommunityResourcePayload {
  name: string;
  resource_type: string;
  description: string;
  address: string;
  contact_phone: string;
  is_safe: boolean;
}

interface FamilyCasePayload {
  name: string;
  relation: string;
  last_seen_location: string;
  last_seen_date: string;
  contact_phone: string;
  status: string;
  notes: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id", autoIncrement: true });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function enqueue<T>(store: OfflineStore, item: Omit<QueueRecord<T>, "id">) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readAll<T>(store: OfflineStore): Promise<QueueRecord<T>[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as QueueRecord<T>[]);
    request.onerror = () => reject(request.error);
  });
}

async function removeIds(store: OfflineStore, ids: number[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const storeRef = tx.objectStore(store);
    ids.forEach((id) => storeRef.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useCommunitySync(user: User | null) {
  const online = useNetworkStatus();
  const syncing = useRef(false);
  const [pending, setPending] = useState({ alerts: 0, reports: 0, groups: 0, resources: 0, family: 0 });

  const refreshPending = useCallback(async () => {
    if (!user) {
      setPending({ alerts: 0, reports: 0, groups: 0, resources: 0, family: 0 });
      return;
    }
    try {
      const counts = await Promise.all(STORES.map(async (store) => {
        const items = await readAll(store);
        return items.filter((item) => item.user_id === user.id).length;
      }));
      setPending({ alerts: counts[0], reports: counts[1], groups: counts[2], resources: counts[3], family: counts[4] });
    } catch (error) {
      console.error("Unable to refresh pending community queue", error);
    }
  }, [user]);

  const syncStore = useCallback(
    async <T, U>(store: OfflineStore, table: string, transform: (payload: T) => U) => {
      if (!user) return;
      const items = await readAll<T>(store);
      const mine = items.filter((item) => item.user_id === user.id && item.id !== undefined);
      if (mine.length === 0) return;

      if (table === "community_alerts") {
        for (const item of mine) {
          const { error } = await supabase.functions.invoke("community-sms", {
            body: JSON.stringify({ ...transform(item.payload), user_id: item.user_id }),
          });
          if (!error) {
            await removeIds(store, [item.id!]);
          }
        }
        return;
      }

      const payloads = mine.map((item) => ({ ...transform(item.payload), user_id: item.user_id }));
      const { error } = await supabase.from(table).insert(payloads);
      if (!error) {
        await removeIds(store, mine.map((item) => item.id!));
      }
    },
    [user],
  );

  const syncAll = useCallback(async () => {
    if (!user || !online || syncing.current) return;
    syncing.current = true;
    try {
      await syncStore<CommunityAlertPayload, Record<string, unknown>>("alerts", "community_alerts", (payload) => payload);
      await syncStore<CommunityReportPayload, Record<string, unknown>>("reports", "community_reports", (payload) => payload);
      await syncStore<CommunityGroupPayload, Record<string, unknown>>("groups", "community_watch_groups", (payload) => payload);
      await syncStore<CommunityResourcePayload, Record<string, unknown>>("resources", "resource_locations", (payload) => payload);
      await syncStore<FamilyCasePayload, Record<string, unknown>>("family", "family_reunifications", (payload) => payload);
    } catch (error) {
      console.error("Community sync failed", error);
    } finally {
      syncing.current = false;
      await refreshPending();
    }
  }, [online, refreshPending, syncStore, user]);

  const sendCommunitySms = useCallback(
    async (payload: CommunityAlertPayload) => {
      if (!user) return { error: new Error("No user") };
      return await supabase.functions.invoke("community-sms", {
        body: JSON.stringify({ ...payload, user_id: user.id }),
      });
    },
    [user],
  );

  const queueItem = useCallback(
    async <T>(store: OfflineStore, payload: T, table: string) => {
      if (!user) return;
      const queuedItem = {
        user_id: user.id,
        payload,
        queued_at: new Date().toISOString(),
      };

      if (online) {
        const insertPayload = { ...payload, user_id: user.id };
        const { error } = await supabase.from(table).insert(insertPayload as unknown as Record<string, unknown>);
        if (!error) {
          await refreshPending();
          return;
        }
      }

      await enqueue(store, queuedItem);
      await refreshPending();
    },
    [online, refreshPending, user],
  );

  const queueAlert = useCallback(
    async (payload: CommunityAlertPayload) => {
      if (!user) return;
      if (online) {
        const { error } = await sendCommunitySms(payload);
        if (!error) {
          await refreshPending();
          return;
        }
      }
      await enqueue("alerts", { user_id: user.id, payload, queued_at: new Date().toISOString() });
      await refreshPending();
    },
    [online, refreshPending, sendCommunitySms, user],
  );
  const queueReport = useCallback(
    async (payload: CommunityReportPayload) => queueItem("reports", payload, "community_reports"),
    [queueItem],
  );
  const queueGroup = useCallback(
    async (payload: CommunityGroupPayload) => queueItem("groups", payload, "community_watch_groups"),
    [queueItem],
  );
  const queueResource = useCallback(
    async (payload: CommunityResourcePayload) => queueItem("resources", payload, "resource_locations"),
    [queueItem],
  );
  const queueFamily = useCallback(
    async (payload: FamilyCasePayload) => queueItem("family", payload, "family_reunifications"),
    [queueItem],
  );

  useEffect(() => {
    if (user) {
      refreshPending();
    }
  }, [refreshPending, user]);

  useEffect(() => {
    if (online && user) {
      void syncAll();
    }
  }, [online, syncAll, user]);

  return { online, syncing: syncing.current, pending, refreshPending, syncAll, queueAlert, queueReport, queueGroup, queueResource, queueFamily };
}
