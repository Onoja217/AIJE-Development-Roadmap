export type ThreatLevel = "low" | "guarded" | "elevated" | "high" | "critical";

export interface OsirisAssessment {
  id: string;
  title: string;
  summary: string;
  threatLevel: ThreatLevel;
  threatScore: number;
  confidence: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    community?: string;
  };
  indicators: string[];
  recommendations: string[];
  generatedAt: string;
  expiresAt?: string;
}

export interface OsirisHotspot {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    community?: string;
  };
  radiusMetres: number;
  riskScore: number;
  threatLevel: ThreatLevel;
  incidentCount: number;
  updatedAt: string;
}

type UnknownRecord = Record<string, unknown>;

// Operational focus: Benue South Senatorial District (Zone C). This bounding
// envelope covers its nine LGAs while rejecting broad Nigeria/Sahel signals.
const REGION = { minLat: 6.45, maxLat: 8.05, minLng: 7.45, maxLng: 8.95 };

const record = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const records = (value: unknown): UnknownRecord[] =>
  Array.isArray(value)
    ? value.map(record).filter((item): item is UnknownRecord => item !== null)
    : [];

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const timestamp = (value: unknown, fallback: string) => {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate))
    ? candidate
    : fallback;
};

const levelFromScore = (score: number): ThreatLevel => {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "elevated";
  if (score >= 30) return "guarded";
  return "low";
};

const inRegion = (latitude: number, longitude: number) =>
  latitude >= REGION.minLat &&
  latitude <= REGION.maxLat &&
  longitude >= REGION.minLng &&
  longitude <= REGION.maxLng;

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const severityScore = (value: unknown) => {
  switch (text(value).toLowerCase()) {
    case "war":
      return 95;
    case "critical":
      return 90;
    case "high":
      return 78;
    case "elevated":
      return 60;
    default:
      return 45;
  }
};

const eventScore = (value: unknown) => {
  switch (text(value).toLowerCase()) {
    case "earthquake":
      return 65;
    case "wildfire":
      return 60;
    case "conflict":
      return 75;
    case "weather":
      return 50;
    default:
      return 40;
  }
};

export interface MapInput {
  conflicts?: unknown;
  gdelt?: unknown;
  countryRisk?: unknown;
  now?: string;
}

export function mapOsirisFeeds(input: MapInput): {
  assessments: OsirisAssessment[];
  hotspots: OsirisHotspot[];
} {
  const now = timestamp(input.now, new Date().toISOString());
  const expiresAt = new Date(Date.parse(now) + 5 * 60_000).toISOString();
  const assessments: OsirisAssessment[] = [];
  const hotspots: OsirisHotspot[] = [];

  // Country-risk records have no Zone C coordinates. Presenting a Nigeria-wide
  // score as local intelligence would be misleading, so only geolocated feeds
  // are eligible for the operational snapshot.

  const conflictPayload = record(input.conflicts);
  for (const zone of records(conflictPayload?.zones)) {
    const latitude = number(zone.lat);
    const longitude = number(zone.lng);
    if (
      latitude === null ||
      longitude === null ||
      !inRegion(latitude, longitude)
    )
      continue;
    const score = severityScore(zone.severity);
    const generatedAt = timestamp(
      zone.lastUpdated ?? conflictPayload?.timestamp,
      now,
    );
    const id = text(zone.id, `${latitude}-${longitude}`);
    const name = text(zone.label, "Regional conflict signal");
    const incidentCount = Math.max(
      0,
      Math.round(number(zone.eventCount) ?? records(zone.events).length),
    );
    assessments.push({
      id: `osiris-conflict-${id}`,
      title: name,
      summary: text(
        zone.description,
        "OSIRIS reported an active regional conflict signal.",
      ),
      threatLevel: levelFromScore(score),
      threatScore: score,
      confidence: 0.9,
      location: {
        latitude,
        longitude,
        community: text(zone.region) || undefined,
      },
      indicators: [
        text(zone.severity, "conflict"),
        `${incidentCount} linked events`,
      ],
      recommendations: [
        "Verify locally before dispatching responders.",
        "Monitor official security advisories.",
      ],
      generatedAt,
      expiresAt,
    });
    hotspots.push({
      id: `osiris-conflict-hotspot-${id}`,
      name,
      location: {
        latitude,
        longitude,
        community: text(zone.region) || undefined,
      },
      radiusMetres: 150_000,
      riskScore: score,
      threatLevel: levelFromScore(score),
      incidentCount,
      updatedAt: generatedAt,
    });
  }

  const gdeltPayload = record(input.gdelt);
  for (const event of records(gdeltPayload?.events)) {
    const latitude = number(event.lat);
    const longitude = number(event.lng);
    if (
      latitude === null ||
      longitude === null ||
      !inRegion(latitude, longitude)
    )
      continue;
    const score = eventScore(event.type);
    const id = text(event.id, `${latitude}-${longitude}`);
    const name = text(event.name, "Regional event");
    const generatedAt = timestamp(
      event.timestamp ?? gdeltPayload?.timestamp,
      now,
    );
    assessments.push({
      id: `osiris-event-${id}`,
      title: name,
      summary: stripHtml(text(event.html, name)).slice(0, 800),
      threatLevel: levelFromScore(score),
      threatScore: score,
      confidence: 0.65,
      location: { latitude, longitude },
      indicators: [text(event.type, "event")],
      recommendations: [
        "Confirm impact and location with local emergency-management sources.",
      ],
      generatedAt,
      expiresAt,
    });
    hotspots.push({
      id: `osiris-event-hotspot-${id}`,
      name,
      location: { latitude, longitude },
      radiusMetres: 50_000,
      riskScore: score,
      threatLevel: levelFromScore(score),
      incidentCount: 1,
      updatedAt: generatedAt,
    });
  }

  return { assessments, hotspots };
}
