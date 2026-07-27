import type { Incident } from "@/types/incident";
import type { IncidentIntelligence } from "@/types/intelligence";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function priorityWeight(priority?: string) {
  switch (priority) {
    case "critical":
      return 40;

    case "high":
      return 30;

    case "medium":
      return 20;

    default:
      return 10;
  }
}

function statusWeight(status: string) {
  switch (status) {
    case "responding":
      return 15;

    case "verified":
      return 10;

    case "resolved":
      return -20;

    default:
      return 0;
  }
}

function threatLevel(score: number) {
  if (score >= 85) return "critical";

  if (score >= 65) return "high";

  if (score >= 40) return "medium";

  return "low";
}

function recommendation(score: number) {
  if (score >= 85)
    return "Deploy emergency response immediately.";

  if (score >= 65)
    return "Dispatch nearest patrol and monitor closely.";

  if (score >= 40)
    return "Continue monitoring and verify reports.";

  return "Routine observation.";
}

export function generateIncidentIntelligence(
  incident: Incident,
  nearbyIncidents = 0
): IncidentIntelligence {

  const score = clamp(
    priorityWeight(incident.priority) +
      statusWeight(incident.status) +
      nearbyIncidents * 5,
    0,
    100
  );

  return {
    threatScore: score,

    confidence: 75,

    threatLevel: threatLevel(score),

    hotspot: nearbyIncidents >= 3,

    nearbyIncidentCount: nearbyIncidents,

    recommendation: recommendation(score),

    indicators: [
      incident.priority,
      incident.status,
    ],

    predictedEscalation:
      score >= 70
        ? "high"
        : score >= 40
        ? "medium"
        : "low",

    riskRadiusKm:
      score >= 85
        ? 10
        : score >= 60
        ? 5
        : 2,

    generatedAt: new Date().toISOString(),
  };
}