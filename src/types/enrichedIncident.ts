import type { Incident } from "@/types/incident";
import type { IncidentIntelligence } from "@/types/intelligence";

export interface EnrichedIncident extends Incident {
  intelligence: IncidentIntelligence;
}
