import type {
  OsirisThreatAssessment,
  OsirisThreatLevel,
} from "@/integrations/osiris/types";

export const OSIRIS_THREAT_ORDER: Record<OsirisThreatLevel, number> = {
  critical: 5,
  high: 4,
  elevated: 3,
  guarded: 2,
  low: 1,
};

export function osirisPercentage(value: number) {
  return Math.round(value <= 1 ? value * 100 : value);
}

export function sortOsirisAssessments(assessments: OsirisThreatAssessment[]) {
  return [...assessments].sort(
    (a, b) =>
      OSIRIS_THREAT_ORDER[b.threatLevel] -
        OSIRIS_THREAT_ORDER[a.threatLevel] || b.threatScore - a.threatScore,
  );
}

export function countExpiredAssessments(
  assessments: OsirisThreatAssessment[],
  now = new Date(),
) {
  return assessments.filter(
    (assessment) =>
      assessment.expiresAt && new Date(assessment.expiresAt) <= now,
  ).length;
}
