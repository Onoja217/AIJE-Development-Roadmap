import { integrationConfig } from "../shared/integrationConfig";
import { supabase } from "@/integrations/supabase/client";

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
  overrides: Partial<IntegrationHealth> = {},
): IntegrationHealth => ({
  provider: "osiris",
  state: "not_configured",
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  lastError: null,
  recordsReceived: 0,
  dataSource: "none",
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
        dataSource: "demo",
      }),
    };
  }

  if (!config.enabled) {
    return { data: emptyPayload, health: createHealth() };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Sign in is required for live Osiris intelligence");
    }

    const { data: response, error } = await supabase.functions.invoke(
      "osiris-adapter",
      { method: "GET" },
    );
    if (error) throw error;

    const data: OsirisIntelligencePayload = {
      assessments: Array.isArray(response?.assessments)
        ? response.assessments
        : [],
      hotspots: Array.isArray(response?.hotspots) ? response.hotspots : [],
    };

    return {
      data,
      health: createHealth({
        state: "connected",
        lastSyncAt: startedAt,
        lastSuccessfulSyncAt: new Date().toISOString(),
        recordsReceived: countRecords(data),
        dataSource: "live",
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
        state: "degraded",
        lastSyncAt: startedAt,
        lastError: `${message} — live intelligence is unavailable`,
        recordsReceived: 0,
      }),
    };
  }
}
