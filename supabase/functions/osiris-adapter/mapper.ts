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

const REGION = { minLat: 2, maxLat: 16, minLng: 2, maxLng: 15 };
const COUNTRY_CENTRES: Record<
  string,
  { name: string; latitude: number; longitude: number }
> = {
  NG: { name: "Nigeria", latitude: 9.082, longitude: 8.6753 },
  BJ: { name: "Benin", latitude: 9.3077, longitude: 2.3158 },
  NE: { name: "Niger", latitude: 17.6078, longitude: 8.0817 },
  TD: { name: "Chad", latitude: 15.4542, longitude: 18.7322 },
  CM: { name: "Cameroon", latitude: 7.3697, longitude: 12.3547 },
};

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

const clampScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

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

const riskLevel = (value: unknown, score: number): ThreatLevel => {
  switch (text(value).toUpperCase()) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "high";
    case "ELEVATED":
      return "elevated";
    case "GUARDED":
      return "guarded";
    case "LOW":
      return "low";
    default:
      return levelFromScore(score);
  }
};

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

  const countryPayload = record(input.countryRisk);
  for (const country of records(countryPayload?.countries)) {
    const code = text(country.code).toUpperCase();
    const centre = COUNTRY_CENTRES[code];
    if (!centre) continue;
    const score = clampScore(number(country.risk_score) ?? 0);
    const indicators = Array.isArray(country.tags)
      ? country.tags.map((tag) => text(tag)).filter(Boolean)
      : [];
    const generatedAt = timestamp(countryPayload?.timestamp, now);
    assessments.push({
      id: `osiris-country-${code.toLowerCase()}`,
      title: `${centre.name} country risk`,
      summary: indicators.length
        ? `OSIRIS country-risk indicators: ${indicators.join(", ")}.`
        : "OSIRIS country-risk assessment.",
      threatLevel: riskLevel(country.risk_level, score),
      threatScore: score,
      confidence: 0.8,
      location: {
        latitude: centre.latitude,
        longitude: centre.longitude,
        address: centre.name,
      },
      indicators,
      recommendations: [
        "Confirm material changes with local authorities and a second intelligence source.",
      ],
      generatedAt,
      expiresAt,
    });
  }

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
