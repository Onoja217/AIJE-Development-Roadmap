import { fetchSafeBenueData } from "@/integrations/safebenue/client";
import { fetchOsirisIntelligence } from "@/integrations/osiris/client";

import type { IntegrationHealth } from "@/integrations/shared/integrationTypes";
import type { SafeBenuePayload } from "@/integrations/safebenue/types";
import type { OsirisIntelligencePayload } from "@/integrations/osiris/types";

export interface CommunityIntegrationSnapshot {
  safeBenue: SafeBenuePayload;
  osiris: OsirisIntelligencePayload;
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
                : "SafeBenue synchronization failed",
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
                : "Osiris synchronization failed",
            recordsReceived: 0,
          },
        };

  return {
    safeBenue: safeBenue.data,
    osiris: osiris.data,
    health: {
      safeBenue: safeBenue.health,
      osiris: osiris.health,
    },
    synchronizedAt: new Date().toISOString(),
  };
}
