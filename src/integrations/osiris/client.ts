import { integrationConfig } from "../shared/integrationConfig";
import { fetchIntegrationJson } from "../shared/integrationHttp";

import type {
  IntegrationHealth,
  IntegrationResult,
} from "../shared/integrationTypes";

import { osirisDemoPayload } from "./demoData";
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

const countRecords = (payload: OsirisIntelligencePayload) =>
  payload.assessments.length + payload.hotspots.length;

export async function fetchOsirisIntelligence(): Promise<
  IntegrationResult<OsirisIntelligencePayload>
> {
  const startedAt = new Date().toISOString();
  const config = integrationConfig.osiris;

  if (integrationConfig.mode === "demo") {
    return {
      data: osirisDemoPayload,
      health: createHealth({
        state: "connected",
        lastSyncAt: startedAt,
        lastSuccessfulSyncAt: startedAt,
        recordsReceived: countRecords(osirisDemoPayload),
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
          "Osiris is enabled but VITE_OSIRIS_BASE_URL is missing or invalid.",
      }),
    };
  }

  try {
    const [assessments, hotspots] = await Promise.all([
      fetchIntegrationJson<OsirisIntelligencePayload["assessments"]>(
        config,
        "/threat-assessments"
      ),
      fetchIntegrationJson<OsirisIntelligencePayload["hotspots"]>(
        config,
        "/hotspots"
      ).catch(() => [] as OsirisIntelligencePayload["hotspots"]),
    ]);

    const data: OsirisIntelligencePayload = {
      assessments: Array.isArray(assessments) ? assessments : [],
      hotspots: Array.isArray(hotspots) ? hotspots : [],
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
        : "Unknown Osiris integration error";

    // Graceful degradation: fall back to the local demo intelligence set so
    // downstream panels keep rendering.
    return {
      data: osirisDemoPayload,
      health: createHealth({
        state: "degraded",
        lastSyncAt: startedAt,
        lastError: `${message} — falling back to demo dataset`,
        recordsReceived: countRecords(osirisDemoPayload),
      }),
    };
  }
}
