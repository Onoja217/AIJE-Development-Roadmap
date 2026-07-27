import type {
  IntegrationConfiguration,
  IntegrationMode,
} from "./integrationTypes";

const parseMode = (
  value: string | undefined
): IntegrationMode => {
  if (
    value === "demo" ||
    value === "staging" ||
    value === "live"
  ) {
    return value;
  }

  return "demo";
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean
): boolean => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
};

const parsePollingInterval = (
  value: string | undefined
): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 5_000) {
    return 30_000;
  }

  return parsed;
};

export const integrationConfig: IntegrationConfiguration = {
  mode: parseMode(
    import.meta.env.VITE_COMMUNITY_SYNC_MODE
  ),

  safeBenueEnabled: parseBoolean(
    import.meta.env.VITE_SAFEBENUE_ENABLED,
    false
  ),

  osirisEnabled: parseBoolean(
    import.meta.env.VITE_OSIRIS_ENABLED,
    false
  ),

  pollingIntervalMs: parsePollingInterval(
    import.meta.env.VITE_COMMUNITY_SYNC_INTERVAL_MS
  ),
};
