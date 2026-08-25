import type {
  IntegrationConfiguration,
  IntegrationEndpointConfig,
  IntegrationMode,
} from "./integrationTypes";

const parseMode = (value: string | undefined): IntegrationMode => {
  if (value === "demo" || value === "staging" || value === "live") {
    return value;
  }

  return "demo";
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const parsePollingInterval = (value: string | undefined): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 5_000) {
    return 30_000;
  }

  return parsed;
};

const safeBenue: IntegrationEndpointConfig = {
  enabled: parseBoolean(import.meta.env.VITE_SAFEBENUE_ENABLED, false),
  baseUrl: null,
  publicToken: null,
};

const osiris: IntegrationEndpointConfig = {
  enabled: parseBoolean(import.meta.env.VITE_OSIRIS_ENABLED, false),
  baseUrl: null,
  publicToken: null,
};

export const integrationConfig: IntegrationConfiguration = {
  mode: parseMode(import.meta.env.VITE_COMMUNITY_SYNC_MODE),
  safeBenueEnabled: safeBenue.enabled,
  osirisEnabled: osiris.enabled,
  pollingIntervalMs: parsePollingInterval(
    import.meta.env.VITE_COMMUNITY_SYNC_INTERVAL_MS,
  ),
  safeBenue,
  osiris,
};
