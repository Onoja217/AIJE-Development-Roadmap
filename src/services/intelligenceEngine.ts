import type { OsirisHotspot, OsirisThreatAssessment } from "@/integrations/osiris/types";
import type { EnrichedIncident } from "@/types/enrichedIncident";
import type { Incident } from "@/types/incident";
import type {
  EscalationPrediction,
  IncidentIntelligence,
  ThreatLevel,
} from "@/types/intelligence";

const EARTH_RADIUS_KM = 6371;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  firstLat: number,
  firstLng: number,
  secondLat: number,
  secondLng: number
): number {
  const latDifference = toRadians(secondLat - firstLat);
  const lngDifference = toRadians(secondLng - firstLng);

  const firstLatitude = toRadians(firstLat);
  const secondLatitude = toRadians(secondLat);

  const haversine =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(lngDifference / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getPriorityScore(priority: Incident["priority"]): number {
  switch (priority) {
    case "critical":
      return 70;

    case "high":
      return 55;

    case "medium":
      return 35;

    case "low":
    default:
      return 15;
  }
}

function getStatusAdjustment(status: Incident["status"]): number {
  switch (status) {
    case "pending":
      return 10;

    case "verified":
      return 15;

    case "responding":
      return 5;

    case "resolved":
      return -45;

    default:
      return 0;
  }
}

function getThreatLevel(score: number): ThreatLevel {
  if (score >= 85) {
    return "critical";
  }

  if (score >= 65) {
    return "high";
  }

  if (score >= 40) {
    return "medium";
  }

  return "low";
}

function getEscalationPrediction(
  score: number
): EscalationPrediction {
  if (score >= 70) {
    return "high";
  }

  if (score >= 40) {
    return "medium";
  }

  return "low";
}

function getFallbackRecommendation(score: number): string {
  if (score >= 85) {
    return "Deploy emergency responders immediately and notify the nearest command centre.";
  }

  if (score >= 65) {
    return "Dispatch the nearest available response team and maintain continuous monitoring.";
  }

  if (score >= 40) {
    return "Verify the report, monitor nearby activity, and prepare responders for possible deployment.";
  }

  return "Continue routine monitoring and retain the incident for operational review.";
}

function hasCoordinates(
  incident: Incident
): incident is Incident & {
  location: {
    lat: number;
    lng: number;
    address?: string;
    manualEntry?: string;
  };
} {
  return (
    typeof incident.location.lat === "number" &&
    typeof incident.location.lng === "number"
  );
}

function countNearbyIncidents(
  incident: Incident,
  incidents: Incident[],
  radiusKm = 5
): number {
  if (!hasCoordinates(incident)) {
    return 0;
  }

  return incidents.filter((candidate) => {
    if (
      candidate.id === incident.id ||
      candidate.status === "resolved" ||
      !hasCoordinates(candidate)
    ) {
      return false;
    }

    return (
      calculateDistanceKm(
        incident.location.lat,
        incident.location.lng,
        candidate.location.lat,
        candidate.location.lng
      ) <= radiusKm
    );
  }).length;
}

function findNearestAssessment(
  incident: Incident,
  assessments: OsirisThreatAssessment[],
  maximumDistanceKm = 10
): OsirisThreatAssessment | null {
  if (!hasCoordinates(incident)) {
    return null;
  }

  let closest: OsirisThreatAssessment | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const assessment of assessments) {
    const distance = calculateDistanceKm(
      incident.location.lat,
      incident.location.lng,
      assessment.location.latitude,
      assessment.location.longitude
    );

    if (
      distance <= maximumDistanceKm &&
      distance < closestDistance
    ) {
      closest = assessment;
      closestDistance = distance;
    }
  }

  return closest;
}

function findContainingHotspot(
  incident: Incident,
  hotspots: OsirisHotspot[]
): OsirisHotspot | null {
  if (!hasCoordinates(incident)) {
    return null;
  }

  let strongestHotspot: OsirisHotspot | null = null;

  for (const hotspot of hotspots) {
    const distanceKm = calculateDistanceKm(
      incident.location.lat,
      incident.location.lng,
      hotspot.location.latitude,
      hotspot.location.longitude
    );

    const hotspotRadiusKm = hotspot.radiusMetres / 1000;

    if (
      distanceKm <= hotspotRadiusKm &&
      (
        !strongestHotspot ||
        hotspot.riskScore > strongestHotspot.riskScore
      )
    ) {
      strongestHotspot = hotspot;
    }
  }

  return strongestHotspot;
}

function createIncidentIntelligence(
  incident: Incident,
  allIncidents: Incident[],
  assessments: OsirisThreatAssessment[],
  hotspots: OsirisHotspot[]
): IncidentIntelligence {
  const nearbyIncidentCount = countNearbyIncidents(
    incident,
    allIncidents
  );

  const assessment = findNearestAssessment(
    incident,
    assessments
  );

  const hotspot = findContainingHotspot(
    incident,
    hotspots
  );

  const operationalScore =
    getPriorityScore(incident.priority) +
    getStatusAdjustment(incident.status) +
    Math.min(nearbyIncidentCount * 5, 15);

  const intelligenceScores = [
    operationalScore,
    assessment?.threatScore,
    hotspot?.riskScore,
  ].filter(
    (score): score is number =>
      typeof score === "number"
  );

  const threatScore = clamp(
    Math.round(
      Math.max(...intelligenceScores)
    )
  );

  const confidence = clamp(
    Math.round(
      assessment?.confidence ??
        (
          hotspot
            ? 75
            : hasCoordinates(incident)
              ? 65
              : 50
        )
    )
  );

  const indicators = [
    `Incident priority: ${incident.priority}`,
    `Incident status: ${incident.status}`,
    nearbyIncidentCount > 0
      ? `${nearbyIncidentCount} nearby active incident${
          nearbyIncidentCount === 1 ? "" : "s"
        }`
      : null,
    assessment
      ? `Matched Osiris assessment: ${assessment.title}`
      : null,
    hotspot
      ? `Inside Osiris hotspot: ${hotspot.name}`
      : null,
    ...(assessment?.indicators ?? []),
  ].filter(
    (indicator): indicator is string =>
      Boolean(indicator)
  );

  return {
    threatScore,
    confidence,
    threatLevel: getThreatLevel(threatScore),
    hotspot: Boolean(hotspot) || nearbyIncidentCount >= 3,
    nearbyIncidentCount,
    recommendation:
      assessment?.recommendations[0] ??
      getFallbackRecommendation(threatScore),
    indicators,
    predictedEscalation:
      getEscalationPrediction(threatScore),
    riskRadiusKm: hotspot
      ? hotspot.radiusMetres / 1000
      : threatScore >= 85
        ? 10
        : threatScore >= 65
          ? 5
          : 2,
    generatedAt: new Date().toISOString(),
  };
}

export function enrichIncidents(
  incidents: Incident[],
  assessments: OsirisThreatAssessment[],
  hotspots: OsirisHotspot[]
): EnrichedIncident[] {
  return incidents
    .map((incident) => ({
      ...incident,
      intelligence: createIncidentIntelligence(
        incident,
        incidents,
        assessments,
        hotspots
      ),
    }))
    .sort(
      (first, second) =>
        second.intelligence.threatScore -
        first.intelligence.threatScore
    );
}