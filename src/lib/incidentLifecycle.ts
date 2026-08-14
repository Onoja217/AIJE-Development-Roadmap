import type {
  IncidentAuditAction,
  IncidentStatus,
  TimelineEvent,
} from "@/types/incident";

export const INCIDENT_LIFECYCLE: readonly IncidentStatus[] = [
  "pending",
  "verified",
  "dispatched",
  "acknowledged",
  "responding",
  "resolved",
];

const TRANSITIONS: Record<IncidentStatus, IncidentStatus | null> = {
  pending: "verified",
  verified: "dispatched",
  dispatched: "acknowledged",
  acknowledged: "responding",
  responding: "resolved",
  resolved: null,
};

const EVENT_BY_STATUS: Record<
  IncidentStatus,
  {
    action: IncidentAuditAction;
    label: TimelineEvent["label"];
  }
> = {
  pending: { action: "report.created", label: "report_received" },
  verified: { action: "report.verified", label: "verification_completed" },
  dispatched: { action: "response.dispatched", label: "team_notified" },
  acknowledged: {
    action: "response.acknowledged",
    label: "dispatch_acknowledged",
  },
  responding: { action: "response.started", label: "response_started" },
  resolved: { action: "incident.resolved", label: "incident_resolved" },
};

export function getNextIncidentStatus(
  status: IncidentStatus,
): IncidentStatus | null {
  return TRANSITIONS[status];
}

export function canTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return TRANSITIONS[from] === to;
}

export function createStatusTimelineEvent(input: {
  status: IncidentStatus;
  note?: string;
  actorId?: string;
  actorName?: string;
  timestamp?: string;
  id?: string;
}): TimelineEvent {
  const event = EVENT_BY_STATUS[input.status];
  return {
    id: input.id ?? crypto.randomUUID(),
    label: event.label,
    action: event.action,
    timestamp: input.timestamp ?? new Date().toISOString(),
    note: input.note,
    actorId: input.actorId,
    actorName: input.actorName,
  };
}
