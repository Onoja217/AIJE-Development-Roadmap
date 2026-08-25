export interface SafeBenueSnapshot {
  incidents: Record<string, unknown>[];
  resources: Record<string, unknown>[];
  missingPersons: Record<string, unknown>[];
}

type UnknownRecord = Record<string, unknown>;

const MAX_RECORDS_PER_FEED = 500;
const MAX_TEXT_LENGTH = 2_000;
const BENUE_BOUNDS = { minLat: 6.2, maxLat: 8.5, minLng: 7.2, maxLng: 10.2 };

const INCIDENT_CATEGORIES = new Set([
  "security",
  "medical",
  "fire",
  "flood",
  "missing_person",
  "infrastructure",
  "other",
]);
const INCIDENT_STATUSES = new Set([
  "reported",
  "verified",
  "responding",
  "resolved",
]);
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const INCIDENT_SOURCES = new Set([
  "citizen",
  "watch_group",
  "responder",
  "system",
]);
const RESOURCE_CATEGORIES = new Set([
  "hospital",
  "police",
  "fire_service",
  "shelter",
  "warehouse",
  "ngo",
  "community_leader",
]);
const AVAILABILITY = new Set(["available", "limited", "unavailable"]);
const MISSING_STATUSES = new Set(["missing", "located", "reunited"]);

const record = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const records = (value: unknown): UnknownRecord[] => {
  const direct = Array.isArray(value) ? value : record(value)?.data;
  return Array.isArray(direct)
    ? direct
        .slice(0, MAX_RECORDS_PER_FEED)
        .map(record)
        .filter((item): item is UnknownRecord => item !== null)
    : [];
};

const text = (value: unknown, required = false): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_TEXT_LENGTH);
  return normalized || (required ? undefined : undefined);
};

const enumValue = (value: unknown, allowed: Set<string>) => {
  const normalized = text(value);
  return normalized && allowed.has(normalized) ? normalized : undefined;
};

const timestamp = (value: unknown) => {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate))
    ? candidate
    : undefined;
};

const location = (value: unknown): UnknownRecord | null => {
  const item = record(value);
  if (!item) return null;
  const latitude = item.latitude;
  const longitude = item.longitude;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    latitude < BENUE_BOUNDS.minLat ||
    latitude > BENUE_BOUNDS.maxLat ||
    longitude < BENUE_BOUNDS.minLng ||
    longitude > BENUE_BOUNDS.maxLng
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    ...(text(item.address) ? { address: text(item.address) } : {}),
    ...(text(item.community) ? { community: text(item.community) } : {}),
    ...(text(item.localGovernment)
      ? { localGovernment: text(item.localGovernment) }
      : {}),
  };
};

export function mapSafeBenueFeeds(input: {
  incidents?: unknown;
  resources?: unknown;
  missingPersons?: unknown;
}): SafeBenueSnapshot {
  const incidents = records(input.incidents).flatMap((item) => {
    const id = text(item.id, true);
    const title = text(item.title, true);
    const description = text(item.description, true);
    const category = enumValue(item.category, INCIDENT_CATEGORIES);
    const status = enumValue(item.status, INCIDENT_STATUSES);
    const severity = enumValue(item.severity, SEVERITIES);
    const source = enumValue(item.source, INCIDENT_SOURCES);
    const reportedAt = timestamp(item.reportedAt);
    const updatedAt = timestamp(item.updatedAt);
    const safeLocation = location(item.location);
    return id &&
      title &&
      description &&
      category &&
      status &&
      severity &&
      source &&
      reportedAt &&
      updatedAt &&
      safeLocation
      ? [
          {
            id,
            title,
            description,
            category,
            status,
            severity,
            source,
            reportedAt,
            updatedAt,
            location: safeLocation,
          },
        ]
      : [];
  });

  const resources = records(input.resources).flatMap((item) => {
    const id = text(item.id, true);
    const name = text(item.name, true);
    const category = enumValue(item.category, RESOURCE_CATEGORIES);
    const availability = enumValue(item.availability, AVAILABILITY);
    const updatedAt = timestamp(item.updatedAt);
    const safeLocation = location(item.location);
    return id && name && category && availability && updatedAt && safeLocation
      ? [
          {
            id,
            name,
            category,
            availability,
            updatedAt,
            location: safeLocation,
            ...(text(item.phone) ? { phone: text(item.phone) } : {}),
          },
        ]
      : [];
  });

  const missingPersons = records(input.missingPersons).flatMap((item) => {
    const id = text(item.id, true);
    const fullName = text(item.fullName, true);
    const status = enumValue(item.status, MISSING_STATUSES);
    const reportedAt = timestamp(item.reportedAt);
    if (!id || !fullName || !status || !reportedAt) return [];
    const age =
      typeof item.age === "number" &&
      Number.isInteger(item.age) &&
      item.age >= 0 &&
      item.age <= 130
        ? item.age
        : undefined;
    const lastSeenAt = timestamp(item.lastSeenAt);
    const lastSeenLocation = location(item.lastSeenLocation);
    return [
      {
        id,
        fullName,
        status,
        reportedAt,
        ...(age !== undefined ? { age } : {}),
        ...(text(item.description)
          ? { description: text(item.description) }
          : {}),
        ...(lastSeenAt ? { lastSeenAt } : {}),
        ...(lastSeenLocation ? { lastSeenLocation } : {}),
      },
    ];
  });

  return { incidents, resources, missingPersons };
}
