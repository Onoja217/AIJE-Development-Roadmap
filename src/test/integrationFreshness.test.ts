import { describe, expect, it } from "vitest";
import { getDataTrustState } from "@/lib/integrationFreshness";
import type { IntegrationHealth } from "@/integrations/shared/integrationTypes";

const health = (overrides: Partial<IntegrationHealth>): IntegrationHealth => ({
  provider: "safebenue",
  state: "connected",
  lastSyncAt: "2026-08-14T00:00:00.000Z",
  lastSuccessfulSyncAt: "2026-08-14T00:00:00.000Z",
  lastError: null,
  recordsReceived: 2,
  dataSource: "live",
  ...overrides,
});

describe("integration freshness", () => {
  it("never presents fallback demo records as live", () => {
    expect(getDataTrustState(health({ dataSource: "demo" }))).toBe("demo");
  });

  it("marks old live data stale", () => {
    expect(
      getDataTrustState(health({}), Date.parse("2026-08-14T00:03:00.001Z")),
    ).toBe("stale");
  });

  it("marks recent live data as live", () => {
    expect(
      getDataTrustState(health({}), Date.parse("2026-08-14T00:01:00.000Z")),
    ).toBe("live");
  });
});
