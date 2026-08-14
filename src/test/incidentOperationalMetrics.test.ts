import { describe, expect, it } from "vitest";
import { calculateIncidentOperationalMetrics } from "@/lib/incidentOperationalMetrics";
import type { Incident } from "@/types/incident";

const base: Incident = {
  id: "incident-1",
  title: "Flood",
  category: "flood",
  description: "Rising water",
  location: {},
  reportedAt: "2026-08-14T00:00:00.000Z",
  priority: "critical",
  status: "resolved",
  operationalUpdatedAt: "2026-08-14T00:45:00.000Z",
  timeline: [
    { id: "1", label: "team_notified", timestamp: "2026-08-14T00:05:00.000Z" },
    {
      id: "2",
      label: "dispatch_acknowledged",
      timestamp: "2026-08-14T00:15:00.000Z",
    },
    {
      id: "3",
      label: "incident_resolved",
      timestamp: "2026-08-14T00:45:00.000Z",
    },
  ],
};

describe("calculateIncidentOperationalMetrics", () => {
  it("measures acknowledgement and resolution time", () => {
    expect(calculateIncidentOperationalMetrics([base])).toMatchObject({
      averageAcknowledgementMinutes: 10,
      averageResolutionMinutes: 45,
    });
  });

  it("flags delayed and stuck active incidents", () => {
    const active = {
      ...base,
      status: "dispatched" as const,
      timeline: [],
      operationalUpdatedAt: base.reportedAt,
    };
    expect(
      calculateIncidentOperationalMetrics(
        [active],
        new Date("2026-08-14T02:00:00.000Z").getTime(),
      ),
    ).toMatchObject({
      delayedAcknowledgements: 1,
      stuckIncidents: 1,
    });
  });
});
