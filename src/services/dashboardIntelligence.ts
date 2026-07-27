import type { DashboardIntelligenceStats } from "@/types/dashboardIntelligence";
import type { EnrichedIncident } from "@/types/enrichedIncident";

function getActiveIncidents(
  incidents: EnrichedIncident[]
): EnrichedIncident[] {
  return incidents.filter(
    (incident) => incident.status !== "resolved"
  );
}

function calculateAverageConfidence(
  incidents: EnrichedIncident[]
): number {
  if (incidents.length === 0) {
    return 0;
  }

  const totalConfidence = incidents.reduce(
    (sum, incident) =>
      sum + incident.intelligence.confidence,
    0
  );

  return Math.round(
    totalConfidence / incidents.length
  );
}

function calculateHighestThreatScore(
  incidents: EnrichedIncident[]
): number {
  if (incidents.length === 0) {
    return 0;
  }

  return Math.max(
    ...incidents.map(
      (incident) =>
        incident.intelligence.threatScore
    )
  );
}

export function buildDashboardIntelligence(
  incidents: EnrichedIncident[]
): DashboardIntelligenceStats {
  const activeIncidents =
    getActiveIncidents(incidents);

  return {
    totalActive: activeIncidents.length,

    criticalThreats: activeIncidents.filter(
      (incident) =>
        incident.intelligence.threatLevel ===
        "critical"
    ).length,

    activeHotspots: activeIncidents.filter(
      (incident) =>
        incident.intelligence.hotspot
    ).length,

    averageConfidence:
      calculateAverageConfidence(activeIncidents),

    highEscalation: activeIncidents.filter(
      (incident) =>
        incident.intelligence
          .predictedEscalation === "high"
    ).length,

    awaitingResponse: activeIncidents.filter(
      (incident) =>
        incident.status === "pending" ||
        incident.status === "verified"
    ).length,

    highestThreatScore:
      calculateHighestThreatScore(
        activeIncidents
      ),
  };
}
