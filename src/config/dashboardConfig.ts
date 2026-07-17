// config/dashboardConfig.ts
import type { IncidentPriority, IncidentStatus } from "../types/incident";

export const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-400" },
  medium: { label: "Medium", color: "bg-yellow-500" },
  high: { label: "High", color: "bg-orange-500" },
  critical: { label: "Critical", color: "bg-red-600" },
};

export const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-slate-400" },
  verified: { label: "Verified", color: "bg-blue-500" },
  responding: { label: "Responding", color: "bg-orange-500" },
  resolved: { label: "Resolved", color: "bg-green-600" },
};

export const TIMELINE_LABELS: Record<string, string> = {
  report_received: "Report received",
  verification_completed: "Verification completed",
  team_notified: "Emergency team notified",
  response_started: "Response started",
  incident_resolved: "Incident resolved",
};