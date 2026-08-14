import type { IntegrationHealth } from "@/integrations/shared/integrationTypes";

export type DataTrustState = "demo" | "live" | "stale" | "unavailable";

export function getDataTrustState(
  health: IntegrationHealth | undefined,
  now = Date.now(),
  staleAfterMs = 120_000,
): DataTrustState {
  if (!health || health.dataSource === "none") return "unavailable";
  if (health.dataSource === "demo") return "demo";
  const successfulAt = health.lastSuccessfulSyncAt
    ? new Date(health.lastSuccessfulSyncAt).getTime()
    : Number.NaN;
  if (!Number.isFinite(successfulAt) || now - successfulAt > staleAfterMs)
    return "stale";
  return "live";
}
