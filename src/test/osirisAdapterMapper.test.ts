import { describe, expect, it } from "vitest";
import { mapOsirisFeeds } from "../../supabase/functions/osiris-adapter/mapper";

const now = "2026-08-24T12:00:00.000Z";

describe("OSIRIS adapter mapper", () => {
  it("does not present national country risk as Zone C intelligence", () => {
    const result = mapOsirisFeeds({
      now,
      countryRisk: {
        timestamp: now,
        countries: [
          {
            code: "NG",
            risk_score: 72.4,
            risk_level: "HIGH",
            tags: ["civil_unrest"],
          },
          { code: "US", risk_score: 20, risk_level: "LOW", tags: [] },
        ],
      },
    });
    expect(result.assessments).toEqual([]);
  });

  it("maps regional conflict zones to assessments and hotspots", () => {
    const result = mapOsirisFeeds({
      now,
      conflicts: {
        timestamp: now,
        zones: [
          {
            id: "benue",
            label: "BENUE",
            severity: "high",
            lat: 7.3,
            lng: 8.7,
            eventCount: 2,
          },
          {
            id: "sahel",
            label: "SAHEL INSTABILITY",
            severity: "high",
            lat: 14,
            lng: 5,
          },
          {
            id: "outside-zone-c",
            label: "NORTHERN NIGERIA",
            severity: "war",
            lat: 12.5,
            lng: 9.9,
          },
        ],
      },
    });
    expect(result.assessments.map((item) => item.id)).toEqual([
      "osiris-conflict-benue",
    ]);
    expect(result.hotspots[0]).toMatchObject({
      incidentCount: 2,
      riskScore: 78,
    });
  });

  it("sanitizes regional event descriptions and ignores malformed coordinates", () => {
    const result = mapOsirisFeeds({
      now,
      gdelt: {
        timestamp: now,
        events: [
          {
            id: "event-1",
            lat: 7.7,
            lng: 8.5,
            name: "Flood",
            html: "<b>Flooding</b> reported",
            type: "weather",
          },
          { id: "event-2", lat: "7.7", lng: 8.5, name: "Invalid" },
          {
            id: "event-3",
            lat: 12.529,
            lng: 9.895,
            name: "Northern Nigeria flood",
            type: "weather",
          },
        ],
      },
    });
    expect(result.assessments).toHaveLength(1);
    expect(result.assessments[0].summary).toBe("Flooding reported");
    expect(result.hotspots[0].threatLevel).toBe("elevated");
  });

  it("returns an honest empty snapshot when upstream has no regional signals", () => {
    expect(
      mapOsirisFeeds({ now, conflicts: { zones: [] }, gdelt: { events: [] } }),
    ).toEqual({
      assessments: [],
      hotspots: [],
    });
  });
});
