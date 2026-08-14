import type { Incident } from "@/types/incident";

const ACKNOWLEDGEMENT_TARGET_MS = 15 * 60 * 1000;
const STUCK_TARGET_MS = 60 * 60 * 1000;

export interface IncidentOperationalMetrics {
  delayedAcknowledgements: number;
  stuckIncidents: number;
  averageAcknowledgementMinutes: number | null;
  averageResolutionMinutes: number | null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length / 60000,
  );
}

export function calculateIncidentOperationalMetrics(
  incidents: Incident[],
  now = Date.now(),
): IncidentOperationalMetrics {
  const acknowledgementTimes: number[] = [];
  const resolutionTimes: number[] = [];

  for (const incident of incidents) {
    const dispatched = incident.timeline.find(
      (event) => event.label === "team_notified",
    );
    const acknowledged = incident.timeline.find(
      (event) => event.label === "dispatch_acknowledged",
    );
    const resolved = incident.timeline.find(
      (event) => event.label === "incident_resolved",
    );
    if (dispatched && acknowledged) {
      acknowledgementTimes.push(
        new Date(acknowledged.timestamp).getTime() -
          new Date(dispatched.timestamp).getTime(),
      );
    }
    if (resolved) {
      resolutionTimes.push(
        new Date(resolved.timestamp).getTime() -
          new Date(incident.reportedAt).getTime(),
      );
    }
  }

  return {
    delayedAcknowledgements: incidents.filter((incident) => {
      if (!["pending", "verified", "dispatched"].includes(incident.status))
        return false;
      const start =
        incident.timeline.find((event) => event.label === "team_notified")
          ?.timestamp ?? incident.reportedAt;
      return now - new Date(start).getTime() > ACKNOWLEDGEMENT_TARGET_MS;
    }).length,
    stuckIncidents: incidents.filter(
      (incident) =>
        incident.status !== "resolved" &&
        now -
          new Date(
            incident.operationalUpdatedAt ?? incident.reportedAt,
          ).getTime() >
          STUCK_TARGET_MS,
    ).length,
    averageAcknowledgementMinutes: average(acknowledgementTimes),
    averageResolutionMinutes: average(resolutionTimes),
  };
}
