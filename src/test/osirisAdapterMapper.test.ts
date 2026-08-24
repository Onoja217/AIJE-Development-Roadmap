import { describe, expect, it } from "vitest";
import { mapOsirisFeeds } from "../../supabase/functions/osiris-adapter/mapper";

const now = "2026-08-24T12:00:00.000Z";

describe("OSIRIS adapter mapper", () => {
  it("maps only supported regional country-risk records", () => {
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
    expect(result.assessments).toHaveLength(1);
    expect(result.assessments[0]).toMatchObject({
      id: "osiris-country-ng",
      threatLevel: "high",
      threatScore: 72,
      indicators: ["civil_unrest"],
    });
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
            id: "outside",
            label: "OUTSIDE",
            severity: "war",
            lat: 48.5,
            lng: 31.2,
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
