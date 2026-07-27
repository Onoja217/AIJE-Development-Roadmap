import { integrationConfig } from "../shared/integrationConfig";

import type {
  IntegrationHealth,
  IntegrationResult,
} from "../shared/integrationTypes";

import type { SafeBenuePayload } from "./types";

const emptyPayload: SafeBenuePayload = {
  incidents: [],
  resources: [],
  missingPersons: [],
};

const createHealth = (
  overrides: Partial<IntegrationHealth> = {}
): IntegrationHealth => ({
  provider: "safebenue",
  state: "not_configured",
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  lastError: null,
  recordsReceived: 0,
  ...overrides,
});

export async function fetchSafeBenueData(): Promise<
  IntegrationResult<SafeBenuePayload>
> {
  if (
    integrationConfig.mode === "demo" ||
    !integrationConfig.safeBenueEnabled
  ) {
    return {
      data: emptyPayload,
      health: createHealth(),
    };
  }

  const startedAt = new Date().toISOString();

  try {
    /*
     * Live requests requiring API credentials should be sent
     * through a Supabase Edge Function.
     *
     * This placeholder will be replaced once the SafeBenue
     * endpoint or database-access method is confirmed.
     */

    return {
      data: emptyPayload,
      health: createHealth({
        state: "degraded",
        lastSyncAt: startedAt,
        lastError:
          "SafeBenue integration is enabled but no live endpoint has been configured.",
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown SafeBenue integration error";

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
