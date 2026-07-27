import { integrationConfig } from "../shared/integrationConfig";

import type {
  IntegrationHealth,
  IntegrationResult,
} from "../shared/integrationTypes";

import type { OsirisIntelligencePayload } from "./types";

const emptyPayload: OsirisIntelligencePayload = {
  assessments: [],
  hotspots: [],
};

const createHealth = (
  overrides: Partial<IntegrationHealth> = {}
): IntegrationHealth => ({
  provider: "osiris",
  state: "not_configured",
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  lastError: null,
  recordsReceived: 0,
  ...overrides,
});

export async function fetchOsirisIntelligence(): Promise<
  IntegrationResult<OsirisIntelligencePayload>
> {
  if (
    integrationConfig.mode === "demo" ||
    !integrationConfig.osirisEnabled
  ) {
    return {
      data: emptyPayload,
      health: createHealth(),
    };
  }

  const startedAt = new Date().toISOString();

  try {
    /*
     * Osiris requests requiring credentials must be routed
     * through a protected backend or Supabase Edge Function.
     */

    return {
      data: emptyPayload,
      health: createHealth({
        state: "degraded",
        lastSyncAt: startedAt,
        lastError:
          "Osiris integration is enabled but no live endpoint has been configured.",
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Osiris integration error";

    return {
      data: emptyPayload,
      health: createHealth({
        state: "disconnected",
        lastSyncAt: startedAt,
        lastError: message,
      }),
    };
  }
}
