export type AlertChannel = "sms" | "whatsapp";
export type ThreatLevel = "low" | "medium" | "high" | "critical";
export type ContactCategory = "police" | "hospital" | "fire_service" | "community_leader" | "volunteer" | "other";
export interface WatchGroup { id:string; name:string; community:string; ward:string; leader:string; memberCount:number; phoneNumbers:string[]; whatsappTargets:string[] }
export interface EmergencyContact { id:string; name:string; category:ContactCategory; phone:string; whatsapp?:string; community?:string; active:boolean }
export interface AlertDraft { incidentId?:string; incidentType:string; summary:string; location:string; threatLevel:ThreatLevel; instructions:string; occurredAt:string; channels:AlertChannel[]; groupIds:string[]; contactIds:string[]; language:string; media?:{type:"image"|"map";url:string;caption?:string}[] }
export interface AlertDispatchResult { alertId:string; queued:number; delivered:number; failed:number }
