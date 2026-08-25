import { integrationConfig } from "../shared/integrationConfig";
import { supabase } from "@/integrations/supabase/client";

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
  overrides: Partial<IntegrationHealth> = {},
): IntegrationHealth => ({
  provider: "safebenue",
  state: "not_configured",
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  lastError: null,
  recordsReceived: 0,
  dataSource: "none",
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
      throw new Error("Sign in is required for live SafeBenue data");
    }

    const { data: response, error } = await supabase.functions.invoke(
      "safebenue-adapter",
      { method: "GET" },
    );
    if (error) throw error;

    const data: SafeBenuePayload = {
      incidents: Array.isArray(response?.incidents) ? response.incidents : [],
      resources: Array.isArray(response?.resources) ? response.resources : [],
      missingPersons: Array.isArray(response?.missingPersons)
        ? response.missingPersons
        : [],
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
        : "Unknown SafeBenue integration error";

    // Never substitute synthetic incidents when a live provider fails.
    return {
      data: emptyPayload,
      health: createHealth({
        state: "degraded",
        lastSyncAt: startedAt,
        lastError: `${message} — live community data is unavailable`,
        recordsReceived: 0,
        dataSource: "none",
      }),
    };
  }
}
