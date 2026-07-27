import { fetchOsirisIntelligence } from "@/integrations/osiris/client";
import type { OsirisIntelligencePayload } from "@/integrations/osiris/types";

import { fetchSafeBenueData } from "@/integrations/safebenue/client";
import { mapSafeBenueIncident } from "@/integrations/safebenue/mapper";
import type { SafeBenuePayload } from "@/integrations/safebenue/types";

import type { IntegrationHealth } from "@/integrations/shared/integrationTypes";

import { enrichIncidents } from "@/services/intelligenceEngine";

import type { EnrichedIncident } from "@/types/enrichedIncident";

export interface CommunityIntegrationSnapshot {
  safeBenue: SafeBenuePayload;

  osiris: OsirisIntelligencePayload;

  intelligence: {
    enrichedIncidents: EnrichedIncident[];
  };

  health: {
    safeBenue: IntegrationHealth;
    osiris: IntegrationHealth;
  };

  synchronizedAt: string;
}

export async function synchronizeCommunityIntegrations(): Promise<
  CommunityIntegrationSnapshot
> {
  const [safeBenueResult, osirisResult] =
    await Promise.allSettled([
      fetchSafeBenueData(),
      fetchOsirisIntelligence(),
    ]);

  const safeBenue =
    safeBenueResult.status === "fulfilled"
      ? safeBenueResult.value
      : {
          data: {
            incidents: [],
            resources: [],
            missingPersons: [],
          },
          health: {
            provider: "safebenue" as const,
            state: "disconnected" as const,
            lastSyncAt: new Date().toISOString(),
            lastSuccessfulSyncAt: null,
            lastError:
              safeBenueResult.reason instanceof Error
                ? safeBenueResult.reason.message
                : "SafeBenue synchronisation failed",
            recordsReceived: 0,
          },
        };

  const osiris =
    osirisResult.status === "fulfilled"
      ? osirisResult.value
      : {
          data: {
            assessments: [],
            hotspots: [],
          },
          health: {
            provider: "osiris" as const,
            state: "disconnected" as const,
            lastSyncAt: new Date().toISOString(),
            lastSuccessfulSyncAt: null,
            lastError:
              osirisResult.reason instanceof Error
                ? osirisResult.reason.message
                : "Osiris synchronisation failed",
            recordsReceived: 0,
          },
        };

  const mappedIncidents =
    safeBenue.data.incidents.map(
      mapSafeBenueIncident
    );

  const enrichedIncidents = enrichIncidents(
    mappedIncidents,
    osiris.data.assessments,
    osiris.data.hotspots
  );

  return {
    safeBenue: safeBenue.data,

    osiris: osiris.data,

    intelligence: {
      enrichedIncidents,
    },

    health: {
      safeBenue: safeBenue.health,
      osiris: osiris.health,
    },

    synchronizedAt: new Date().toISOString(),
  };
}