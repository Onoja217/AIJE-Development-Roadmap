import { AlertTriangle, Database, Radio } from "lucide-react";
import type {
  IntegrationHealth,
  IntegrationMode,
} from "@/integrations/shared/integrationTypes";
import { getDataTrustState } from "@/lib/integrationFreshness";

interface IntegrationTrustBannerProps {
  mode: IntegrationMode;
  providers: IntegrationHealth[];
}

export function IntegrationTrustBanner({
  mode,
  providers,
}: IntegrationTrustBannerProps) {
  const states = providers.map((health) => getDataTrustState(health));
  const hasDemo = states.includes("demo");
  const hasStale = states.includes("stale");
  const hasUnavailable = states.includes("unavailable");
  const trustedLive =
    mode === "live" &&
    states.length > 0 &&
    states.every((state) => state === "live");

  if (trustedLive) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-200">
        <Radio className="h-4 w-4 shrink-0" /> Live operational data · all
        sources recently synchronized
      </div>
    );
  }

  const message = hasDemo
    ? "SIMULATED DATA — do not use this view for operational decisions."
    : hasStale
      ? "STALE DATA — a live source has not synchronized recently. Confirm by another channel."
      : hasUnavailable
        ? "DATA UNAVAILABLE — one or more operational sources are not providing records."
        : `${mode.toUpperCase()} MODE — this is not verified live operational data.`;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 p-3 text-sm font-semibold text-amber-900 dark:text-amber-100"
    >
      {hasDemo ? (
        <Database className="h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </div>
  );
}
