import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notificationService";
import type { AlertDispatchResult, AlertDraft } from "@/types/communityAlert";
const QUEUE_KEY = "aije-community-alert-outbox";

function readOutbox(): AlertDraft[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

function writeOutbox(queue: AlertDraft[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

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

export async function dispatchCommunityAlert(draft:AlertDraft):Promise<AlertDispatchResult> {
  if (!navigator.onLine) { const queue=readOutbox(); queue.push(draft); writeOutbox(queue); void notifyCommunityAlert(draft,true).catch(() => undefined); return {alertId:`offline-${Date.now()}`,queued:1,delivered:0,failed:0}; }
  const {data,error}=await supabase.functions.invoke("dispatch-community-alert",{body:draft}); if(error) throw error; void notifyCommunityAlert(draft,false).catch(() => undefined); return data as AlertDispatchResult;
}
export async function flushAlertOutbox(){ const queue=readOutbox(); if(!navigator.onLine||!queue.length)return 0; let sent=0; for(const item of queue){try{await dispatchCommunityAlert(item);sent++}catch{break}} if(sent)writeOutbox(queue.slice(sent)); return sent; }
export function formatSmsAlert(d:AlertDraft){return `[AIJE ${d.threatLevel.toUpperCase()}] ${d.incidentType} — ${d.location}. ${new Date(d.occurredAt).toLocaleString()}. ${d.instructions}`.slice(0,480)}
export function formatWhatsAppAlert(d:AlertDraft){return `*AIJE VERIFIED ALERT*\n${d.summary}\nLocation: ${d.location}\nThreat: ${d.threatLevel.toUpperCase()}\nTime: ${new Date(d.occurredAt).toLocaleString()}`}
