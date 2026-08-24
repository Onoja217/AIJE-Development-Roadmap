import type {
  OsirisHotspot,
  OsirisThreatAssessment,
} from "./types";
import type { EmergencyResource } from "@/types/resource";

export function mapOsirisAssessment(
  assessment: OsirisThreatAssessment
) {
  return {
    externalId: assessment.id,
    title: assessment.title,
    summary: assessment.summary,
    threatLevel: assessment.threatLevel,
    threatScore: assessment.threatScore,
    confidence: assessment.confidence,
    location: {
      lat: assessment.location.latitude,
      lng: assessment.location.longitude,
      address: assessment.location.address,
      community: assessment.location.community,
    },
    indicators: assessment.indicators,
    recommendations: assessment.recommendations,
    source: "osiris" as const,
    generatedAt: assessment.generatedAt,
    expiresAt: assessment.expiresAt,
  };
}

export function mapOsirisHotspot(
  hotspot: OsirisHotspot
) {
  return {
    externalId: hotspot.id,
    name: hotspot.name,
    lat: hotspot.location.latitude,
    lng: hotspot.location.longitude,
    radiusMetres: hotspot.radiusMetres,
    riskScore: hotspot.riskScore,
    threatLevel: hotspot.threatLevel,
    incidentCount: hotspot.incidentCount,
    source: "osiris" as const,
    updatedAt: hotspot.updatedAt,
  };
}

/**
 * Presents an Osiris risk hotspot on the emergency map when no SafeBenue
 * facilities are available. A hotspot is intelligence, not a response
 * facility, so the copy and unavailable status must remain explicit.
 */
export function mapOsirisHotspotToResource(
  hotspot: OsirisHotspot,
): EmergencyResource {
  const locationLabel =
    hotspot.location.address ??
    hotspot.location.community ??
    "Location supplied by Osiris";

  return {
    id: `osiris-hotspot-${hotspot.id}`,
    name: `Risk hotspot: ${hotspot.name}`,
    category: "command_centre",
    description:
      "Osiris intelligence hotspot shown for situational awareness. This marker is not an emergency facility.",
    notes: `Threat level: ${hotspot.threatLevel}; risk score: ${hotspot.riskScore}; recent incidents: ${hotspot.incidentCount}; radius: ${hotspot.radiusMetres} metres.`,
    address: locationLabel,
    community: hotspot.location.community,
    state: "Benue",
    country: "Nigeria",
    lat: hotspot.location.latitude,
    lng: hotspot.location.longitude,
    status: "temporarily_unavailable",
    verificationStatus: "verified",
    visibility: "public",
    isPublic: true,
    updatedBy: "osiris-integration",
    verifiedBy: "osiris-integration",
    lastVerifiedAt: hotspot.updatedAt,
    updatedAt: hotspot.updatedAt,
  };
}
