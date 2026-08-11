import { describe, expect, it } from "vitest";
import {
  computeStats,
  filterIncidents,
  sortByMostRecent,
} from "@/lib/incidentUtils";
import type { Incident } from "@/types/incident";

const incidents = [
  {
    id: "old-resolved",
    title: "Resolved fire",
    description: "Contained",
    category: "fire",
    priority: "high",
    status: "resolved",
    reportedAt: "2026-08-01T10:00:00.000Z",
    location: { manualEntry: "Makurdi" },
  },
  {
    id: "critical",
    title: "Bridge incident",
    description: "Response needed",
    category: "accident",
    priority: "critical",
    status: "responding",
    reportedAt: "2026-08-02T10:00:00.000Z",
    location: { address: "Otukpo bridge" },
  },
] as Incident[];

describe("incident utilities", () => {
  it("filters searchable incident fields without mutating input", () => {
    expect(filterIncidents(incidents, { search: "otukpo" })).toEqual([
      incidents[1],
    ]);
    expect(incidents).toHaveLength(2);
  });

  it("sorts newest first without mutating input", () => {
    expect(sortByMostRecent(incidents).map(({ id }) => id)).toEqual([
      "critical",
      "old-resolved",
    ]);
    expect(incidents[0].id).toBe("old-resolved");
  });

  it("computes active response counts", () => {
    expect(computeStats(incidents)).toMatchObject({
      totalActive: 1,
      critical: 1,
      respondingTeams: 1,
    });
  });

  it("combines status, priority, category, responder, and date filters", () => {
    expect(filterIncidents(incidents, { status: "responding" })).toEqual([
      incidents[1],
    ]);
    expect(filterIncidents(incidents, { priority: "critical" })).toEqual([
      incidents[1],
    ]);
    expect(filterIncidents(incidents, { category: "fire" })).toEqual([
      incidents[0],
    ]);
    expect(
      filterIncidents([{ ...incidents[1], assignedResponder: "Team A" }], {
        assignedResponder: "Team A",
      }),
    ).toHaveLength(1);
    expect(filterIncidents(incidents, { dateFrom: "2026-08-02" })).toEqual([
      incidents[1],
    ]);
    expect(
      filterIncidents(incidents, { dateTo: "2026-08-01T23:59:59Z" }),
    ).toEqual([incidents[0]]);
    expect(filterIncidents(incidents, { search: "not present" })).toEqual([]);
  });
});
