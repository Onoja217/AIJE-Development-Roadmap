export type OsirisThreatLevel =
  | "low"
  | "guarded"
  | "elevated"
  | "high"
  | "critical";

export interface OsirisLocation {
  latitude: number;
  longitude: number;
  address?: string;
  community?: string;
}

export interface OsirisThreatAssessment {
  id: string;
  title: string;
  summary: string;
  threatLevel: OsirisThreatLevel;
  threatScore: number;
  confidence: number;
  location: OsirisLocation;
  indicators: string[];
  recommendations: string[];
  generatedAt: string;
  expiresAt?: string;
}

export interface OsirisHotspot {
  id: string;
  name: string;
  location: OsirisLocation;
  radiusMetres: number;
  riskScore: number;
  threatLevel: OsirisThreatLevel;
  incidentCount: number;
  updatedAt: string;
}

export interface OsirisIntelligencePayload {
  assessments: OsirisThreatAssessment[];
  hotspots: OsirisHotspot[];
}
