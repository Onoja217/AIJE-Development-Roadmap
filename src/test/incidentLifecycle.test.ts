import { describe, expect, it } from "vitest";
import {
  INCIDENT_LIFECYCLE,
  canTransitionIncident,
  createStatusTimelineEvent,
  getNextIncidentStatus,
} from "@/lib/incidentLifecycle";

describe("incident lifecycle", () => {
  it("requires dispatch acknowledgement before response starts", () => {
    expect(INCIDENT_LIFECYCLE).toEqual([
      "pending",
      "verified",
      "dispatched",
      "acknowledged",
      "responding",
      "resolved",
    ]);
    expect(canTransitionIncident("verified", "responding")).toBe(false);
    expect(getNextIncidentStatus("dispatched")).toBe("acknowledged");
  });

  it("does not allow reopening or skipping lifecycle states", () => {
    expect(canTransitionIncident("resolved", "pending")).toBe(false);
    expect(canTransitionIncident("pending", "dispatched")).toBe(false);
    expect(getNextIncidentStatus("resolved")).toBeNull();
  });

  it("creates an attributable audit event", () => {
    expect(
      createStatusTimelineEvent({
        status: "acknowledged",
        actorId: "operator-1",
        actorName: "Ada Operator",
        timestamp: "2026-08-14T00:00:00.000Z",
        id: "event-1",
      }),
    ).toMatchObject({
      id: "event-1",
      action: "response.acknowledged",
      label: "dispatch_acknowledged",
      actorId: "operator-1",
      actorName: "Ada Operator",
    });
  });
});
