import { integrationConfig } from "../shared/integrationConfig";
import { fetchIntegrationJson } from "../shared/integrationHttp";

import type {
  IntegrationHealth,
  IntegrationResult,
} from "../shared/integrationTypes";

import { safeBenueDemoPayload } from "./demoData";
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

const countRecords = (payload: SafeBenuePayload) =>
  payload.incidents.length +
  payload.resources.length +
  payload.missingPersons.length;

export async function fetchSafeBenueData(): Promise<
  IntegrationResult<SafeBenuePayload>
> {
  const startedAt = new Date().toISOString();
  const config = integrationConfig.safeBenue;

  // Demo mode: deterministic local dataset, no network calls.
  if (integrationConfig.mode === "demo") {
    return {
      data: safeBenueDemoPayload,
      health: createHealth({
        state: "connected",
        lastSyncAt: startedAt,
        lastSuccessfulSyncAt: startedAt,
        recordsReceived: countRecords(safeBenueDemoPayload),
      }),
    };
  }

  if (!config.enabled) {
    return { data: emptyPayload, health: createHealth() };
  }

  if (!config.baseUrl) {
    return {
      data: emptyPayload,
      health: createHealth({
        state: "not_configured",
        lastSyncAt: startedAt,
        lastError:
          "SafeBenue is enabled but VITE_SAFEBENUE_BASE_URL is missing or invalid.",
      }),
    };
  }

  try {
    const [incidents, resources, missingPersons] = await Promise.all([
      fetchIntegrationJson<SafeBenuePayload["incidents"]>(
        config,
        "/incidents"
      ),
      fetchIntegrationJson<SafeBenuePayload["resources"]>(
        config,
        "/resources"
      ),
      fetchIntegrationJson<SafeBenuePayload["missingPersons"]>(
        config,
        "/missing-persons"
      ).catch(() => [] as SafeBenuePayload["missingPersons"]),
    ]);

    const data: SafeBenuePayload = {
      incidents: Array.isArray(incidents) ? incidents : [],
      resources: Array.isArray(resources) ? resources : [],
      missingPersons: Array.isArray(missingPersons) ? missingPersons : [],
    };

    return {
      data,
      health: createHealth({
        state: "connected",
        lastSyncAt: startedAt,
        lastSuccessfulSyncAt: new Date().toISOString(),
        recordsReceived: countRecords(data),
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown SafeBenue integration error";

    // Graceful degradation: keep the operations views usable with the local
    // demo dataset instead of rendering an empty dashboard.
    return {
      data: safeBenueDemoPayload,
      health: createHealth({
        state: "degraded",
        lastSyncAt: startedAt,
        lastError: `${message} — falling back to demo dataset`,
        recordsReceived: countRecords(safeBenueDemoPayload),
      }),
    };
  }
}
