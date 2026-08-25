import { describe, expect, it } from "vitest";

import { mapSafeBenueFeeds } from "../../supabase/functions/safebenue-adapter/mapper";

const location = {
  latitude: 7.19,
  longitude: 8.13,
  community: "Otukpo",
  localGovernment: "Otukpo",
};

describe("SafeBenue adapter mapper", () => {
  it("accepts valid adapter records and wrapped data arrays", () => {
    const result = mapSafeBenueFeeds({
      incidents: {
        data: [
          {
            id: "incident-1",
            title: "Flood warning",
            description: "River level rising",
            category: "flood",
            status: "verified",
            severity: "high",
            source: "responder",
            reportedAt: "2026-08-25T00:00:00.000Z",
            updatedAt: "2026-08-25T00:05:00.000Z",
            location,
          },
        ],
      },
      resources: [
        {
          id: "resource-1",
          name: "Community clinic",
          category: "hospital",
          availability: "available",
          updatedAt: "2026-08-25T00:05:00.000Z",
          location,
        },
      ],
    });

    expect(result.incidents).toHaveLength(1);
    expect(result.resources).toHaveLength(1);
  });

  it("drops malformed, out-of-region, and unsupported records", () => {
    const result = mapSafeBenueFeeds({
      incidents: [
        {
          id: "bad",
          title: "Bad coordinates",
          description: "Not in Benue",
          category: "flood",
          status: "verified",
          severity: "high",
          source: "responder",
          reportedAt: "not-a-date",
          updatedAt: "2026-08-25T00:05:00.000Z",
          location: { latitude: 51.5, longitude: -0.1 },
        },
      ],
      resources: [
        {
          id: "bad-resource",
          name: "Unknown",
          category: "airport",
          availability: "available",
          updatedAt: "2026-08-25T00:05:00.000Z",
          location,
        },
      ],
    });

    expect(result.incidents).toEqual([]);
    expect(result.resources).toEqual([]);
  });

  it("removes unknown fields and validates missing-person ages", () => {
    const result = mapSafeBenueFeeds({
      missingPersons: [
        {
          id: "person-1",
          fullName: "Ada Example",
          age: 999,
          status: "located",
          reportedAt: "2026-08-25T00:00:00.000Z",
          secretInternalNote: "must not cross adapter",
        },
      ],
    });

    expect(result.missingPersons).toEqual([
      {
        id: "person-1",
        fullName: "Ada Example",
        status: "located",
        reportedAt: "2026-08-25T00:00:00.000Z",
      },
    ]);
  });
});
