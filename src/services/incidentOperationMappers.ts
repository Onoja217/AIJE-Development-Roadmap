import type { Tables } from "@/integrations/supabase/types";
import type {
  Incident,
  IncidentPriority,
  IncidentStatus,
  TimelineEvent,
} from "@/types/incident";

export type IncidentReportRow = Tables<"incident_reports">;
export type IncidentAuditRow = Tables<"incident_audit_log">;

const STATUSES = new Set<IncidentStatus>([
  "pending",
  "verified",
  "dispatched",
  "acknowledged",
  "responding",
  "resolved",
]);
const PRIORITIES = new Set<IncidentPriority>([
  "low",
  "medium",
  "high",
  "critical",
]);

export function isIncidentStatus(value: string): value is IncidentStatus {
  return STATUSES.has(value as IncidentStatus);
}

function inferPriority(category: string): IncidentPriority {
  const normalized = category.toLowerCase();
  if (
    ["attack", "fire", "medical", "security"].some((value) =>
      normalized.includes(value),
    )
  )
    return "high";
  return PRIORITIES.has(normalized as IncidentPriority)
    ? (normalized as IncidentPriority)
    : "medium";
}

export function mapIncidentReport(row: IncidentReportRow): Incident {
  const status = isIncidentStatus(row.status) ? row.status : "pending";
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    location: {
      lat: row.latitude ?? undefined,
      lng: row.longitude ?? undefined,
      address: row.address ?? undefined,
      manualEntry: row.manual_location ?? undefined,
    },
    reportedAt: row.occurred_at,
    priority: inferPriority(row.category),
    status,
    timeline: [
      {
        id: `${row.id}-created`,
        label: "report_received",
        action: "report.created",
        timestamp: row.created_at,
      },
    ],
    imageUrls: [],
    origin: "database",
  };
}

export function mapAuditRow(row: IncidentAuditRow): TimelineEvent {
  const status = row.to_status ?? row.new_status;
  const label: TimelineEvent["label"] =
    status === "verified"
      ? "verification_completed"
      : status === "dispatched"
        ? "team_notified"
        : status === "acknowledged"
          ? "dispatch_acknowledged"
          : status === "responding"
            ? "response_started"
            : status === "resolved"
              ? "incident_resolved"
              : "report_received";
  return {
    id: row.id,
    label,
    timestamp: row.created_at,
    note: row.note ?? row.reason ?? undefined,
    actorId: row.actor_id ?? undefined,
    action: row.action as TimelineEvent["action"] | undefined,
  };
}
