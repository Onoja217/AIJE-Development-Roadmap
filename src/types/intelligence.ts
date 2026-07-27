export type ThreatLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type EscalationPrediction =
  | "low"
  | "medium"
  | "high";

export interface IncidentIntelligence {
  /**
   * Overall threat score (0–100)
   */
  threatScore: number;

  /**
   * Confidence in this assessment (0–100)
   */
  confidence: number;

  /**
   * Human-readable threat category
   */
  threatLevel: ThreatLevel;

  /**
   * Whether the incident belongs to a hotspot.
   */
  hotspot: boolean;

  /**
   * Nearby related incidents.
   */
  nearbyIncidentCount: number;

  /**
   * AI recommendation for operators.
   */
  recommendation: string;

  /**
   * Indicators used in scoring.
   */
  indicators: string[];

  /**
   * Expected escalation.
   */
  predictedEscalation: EscalationPrediction;

  /**
   * Estimated impact radius.
   */
  riskRadiusKm: number;

  /**
   * Time intelligence was produced.
   */
  generatedAt: string;
}