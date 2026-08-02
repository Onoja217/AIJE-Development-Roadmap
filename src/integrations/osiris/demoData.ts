import type { OsirisIntelligencePayload } from "./types";

const now = Date.now();
const iso = (minutesAgo: number) =>
  new Date(now - minutesAgo * 60_000).toISOString();

/** Demo dataset used when VITE_COMMUNITY_SYNC_MODE=demo. */
export const osirisDemoPayload: OsirisIntelligencePayload = {
  assessments: [
    {
      id: "os-demo-1",
      title: "Elevated armed-group activity — Ochekwu corridor",
      summary:
        "Repeated sightings along the eastern farm corridor indicate staging activity ahead of nightfall.",
      threatLevel: "critical",
      threatScore: 88,
      confidence: 0.76,
      location: {
        latitude: 7.7322,
        longitude: 8.5391,
        community: "Ochekwu",
      },
      indicators: [
        "Three separate sightings within 90 minutes",
        "Movement toward isolated farm settlements",
        "Historical incidents in the same corridor",
      ],
      recommendations: [
        "Alert the Ochekwu watch group leaders",
        "Notify divisional police at authority level 2",
        "Advise farmers to withdraw before dusk",
      ],
      generatedAt: iso(7),
      expiresAt: new Date(now + 6 * 3_600_000).toISOString(),
    },
    {
      id: "os-demo-2",
      title: "Flood risk sustained — Wadata bridge",
      summary:
        "River levels remain above threshold; access road likely impassable for 24 hours.",
      threatLevel: "elevated",
      threatScore: 61,
      confidence: 0.83,
      location: {
        latitude: 7.6801,
        longitude: 8.6112,
        community: "Wadata",
      },
      indicators: ["Sustained rainfall", "Road already partially submerged"],
      recommendations: [
        "Pre-position relief supplies on the northern bank",
        "Share alternate route with responders",
      ],
      generatedAt: iso(35),
    },
  ],
  hotspots: [
    {
      id: "os-hs-1",
      name: "Ochekwu farm corridor",
      location: { latitude: 7.7322, longitude: 8.5391, community: "Ochekwu" },
      radiusMetres: 2500,
      riskScore: 84,
      threatLevel: "critical",
      incidentCount: 9,
      updatedAt: iso(10),
    },
    {
      id: "os-hs-2",
      name: "Wadata riverbank",
      location: { latitude: 7.6801, longitude: 8.6112, community: "Wadata" },
      radiusMetres: 1800,
      riskScore: 58,
      threatLevel: "elevated",
      incidentCount: 4,
      updatedAt: iso(45),
    },
  ],
};
