import type {
  OsirisHotspot,
  OsirisThreatAssessment,
} from "./types";

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
