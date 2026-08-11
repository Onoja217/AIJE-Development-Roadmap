import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notificationService";
import { enqueue, processQueue, registerSyncHandler } from "@/lib/syncEngine";
import type { AlertDispatchResult, AlertDraft } from "@/types/communityAlert";
import { getStoredActiveOrganizationId } from "@/features/access/accessStorage";

const LEGACY_QUEUE_KEY = "aije-community-alert-outbox";
const ALERT_COLLECTION = "community_alerts";
let registered = false;

function isAlertDraft(value: unknown): value is AlertDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<AlertDraft>;
  return (
    typeof draft.incidentType === "string" &&
    typeof draft.summary === "string" &&
    typeof draft.location === "string" &&
    typeof draft.occurredAt === "string" &&
    Array.isArray(draft.channels) &&
    Array.isArray(draft.groupIds) &&
    Array.isArray(draft.contactIds)
  );
}

function readLegacyOutbox(): AlertDraft[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(LEGACY_QUEUE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isAlertDraft) : [];
  } catch {
    return [];
  }
}

async function invokeAlert(draft: AlertDraft): Promise<AlertDispatchResult> {
  const correlationId = crypto.randomUUID();
  const { data, error } = await supabase.functions.invoke(
    "dispatch-community-alert",
    {
      body: draft,
      headers: { "x-correlation-id": correlationId },
    },
  );
  if (error) throw new Error(`Alert dispatch failed (${correlationId})`);
  if (!data || typeof data.alertId !== "string")
    throw new Error(`Invalid alert response (${correlationId})`);
  return data as AlertDispatchResult;
}

function registerAlertSync() {
  if (registered) return;
  registered = true;
  registerSyncHandler<AlertDraft>(ALERT_COLLECTION, async (draft, item) => {
    await invokeAlert({
      ...draft,
      idempotencyKey: draft.idempotencyKey ?? item.id,
    });
  });
}

registerAlertSync();

async function notifyCommunityAlert(draft: AlertDraft, queued: boolean) {
  await createNotification({
    category: "community_alert",
    priority: draft.threatLevel === "critical" ? "critical" : "high",
    title: `${queued ? "Queued" : "Dispatched"} community alert: ${draft.incidentType}`,
    body: `${draft.summary} — ${draft.location}`,
    link: "/community-alerts",
    metadata: { threatLevel: draft.threatLevel, queued },
  });
}

async function queueAlert(draft: AlertDraft): Promise<AlertDispatchResult> {
  const queueId = await enqueue(ALERT_COLLECTION, draft);
  void notifyCommunityAlert(draft, true).catch(() => undefined);
  return { alertId: `offline-${queueId}`, queued: 1, delivered: 0, failed: 0 };
}

export async function dispatchCommunityAlert(
  draft: AlertDraft,
): Promise<AlertDispatchResult> {
  registerAlertSync();
  const payload = {
    ...draft,
    organizationId:
      draft.organizationId ?? getStoredActiveOrganizationId() ?? undefined,
    idempotencyKey: draft.idempotencyKey ?? crypto.randomUUID(),
  };
  if (!navigator.onLine) return queueAlert(payload);

  try {
    const result = await invokeAlert(payload);
    void notifyCommunityAlert(payload, false).catch(() => undefined);
    return result;
  } catch {
    return queueAlert(payload);
  }
}

export async function flushAlertOutbox() {
  registerAlertSync();
  const legacy = readLegacyOutbox();
  for (const draft of legacy) await enqueue(ALERT_COLLECTION, draft);
  if (legacy.length) localStorage.removeItem(LEGACY_QUEUE_KEY);
  if (navigator.onLine) await processQueue();
  return legacy.length;
}

export function formatSmsAlert(draft: AlertDraft) {
  return `[AIJE ${draft.threatLevel.toUpperCase()}] ${draft.incidentType} — ${draft.location}. ${new Date(draft.occurredAt).toLocaleString()}. ${draft.instructions}`.slice(
    0,
    480,
  );
}

export function formatWhatsAppAlert(draft: AlertDraft) {
  return `*AIJE VERIFIED ALERT*\n${draft.summary}\nLocation: ${draft.location}\nThreat: ${draft.threatLevel.toUpperCase()}\nTime: ${new Date(draft.occurredAt).toLocaleString()}`;
}
