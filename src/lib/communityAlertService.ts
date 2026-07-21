import { supabase } from "@/integrations/supabase/client";
import type { AlertDispatchResult, AlertDraft } from "@/types/communityAlert";
const QUEUE_KEY = "aije-community-alert-outbox";
export async function dispatchCommunityAlert(draft:AlertDraft):Promise<AlertDispatchResult> {
  if (!navigator.onLine) { const queue=JSON.parse(localStorage.getItem(QUEUE_KEY)??"[]") as AlertDraft[]; queue.push(draft); localStorage.setItem(QUEUE_KEY,JSON.stringify(queue)); return {alertId:`offline-${Date.now()}`,queued:1,delivered:0,failed:0}; }
  const {data,error}=await supabase.functions.invoke("dispatch-community-alert",{body:draft}); if(error) throw error; return data as AlertDispatchResult;
}
export async function flushAlertOutbox(){ const queue=JSON.parse(localStorage.getItem(QUEUE_KEY)??"[]") as AlertDraft[]; if(!navigator.onLine||!queue.length)return 0; let sent=0; for(const item of queue){try{await dispatchCommunityAlert(item);sent++}catch{break}} if(sent)localStorage.setItem(QUEUE_KEY,JSON.stringify(queue.slice(sent))); return sent; }
export function formatSmsAlert(d:AlertDraft){return `[AIJE ${d.threatLevel.toUpperCase()}] ${d.incidentType} — ${d.location}. ${new Date(d.occurredAt).toLocaleString()}. ${d.instructions}`.slice(0,480)}
export function formatWhatsAppAlert(d:AlertDraft){return `*AIJE VERIFIED ALERT*\n${d.summary}\nLocation: ${d.location}\nThreat: ${d.threatLevel.toUpperCase()}\nTime: ${new Date(d.occurredAt).toLocaleString()}`}
