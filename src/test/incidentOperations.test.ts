import { describe, expect, it } from "vitest";
import {
  mapAuditRow,
  mapIncidentReport,
  type IncidentAuditRow,
  type IncidentReportRow,
} from "@/services/incidentOperations";

describe("incident operations mapping", () => {
  it("maps canonical organization reports into durable incidents", () => {
    const row = {
      id: "00000000-0000-4000-8000-000000000001",
      organization_id: "00000000-0000-4000-8000-000000000010",
      reporter_id: "00000000-0000-4000-8000-000000000020",
      assigned_team_id: null,
      client_id: "client-1",
      title: "Market fire",
      category: "fire",
      description: "Smoke reported",
      contact: null,
      address: "Central market",
      latitude: 7.1,
      longitude: 8.2,
      manual_location: null,
      image_count: 0,
      status: "dispatched",
      occurred_at: "2026-08-14T00:00:00.000Z",
      created_at: "2026-08-14T00:00:00.000Z",
      updated_at: "2026-08-14T00:01:00.000Z",
    } satisfies IncidentReportRow;

    expect(mapIncidentReport(row)).toMatchObject({
      id: row.id,
      status: "dispatched",
      priority: "high",
      origin: "database",
      location: { address: "Central market" },
    });
  });

  it("maps compatible legacy audit rows into the canonical timeline", () => {
    const row = {
      id: "audit-1",
      incident_id: "incident-1",
      incident_report_id: "incident-1",
      organization_id: "org-1",
      actor_id: "operator-1",
      action: "response.acknowledged",
      previous_status: "dispatched",
      new_status: "acknowledged",
      from_status: "dispatched",
      to_status: "acknowledged",
      reason: null,
      note: "Team accepted",
      correlation_id: "correlation-1",
      metadata: {},
      created_at: "2026-08-14T00:02:00.000Z",
    } satisfies IncidentAuditRow;

    expect(mapAuditRow(row)).toMatchObject({
      label: "dispatch_acknowledged",
      action: "response.acknowledged",
      actorId: "operator-1",
      note: "Team accepted",
    });
  });
});
