import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIntegrationJson } from "@/integrations/shared/integrationHttp";

const config = {
  enabled: true,
  baseUrl: "https://provider.test",
  publicToken: "public-token",
};

afterEach(() => vi.unstubAllGlobals());

describe("provider failure drill", () => {
  it("returns JSON and sends only the configured public token", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response('{"healthy":true}', { status: 200 }));
    vi.stubGlobal("fetch", request);
    await expect(
      fetchIntegrationJson(config, "/health", { retries: 1 }),
    ).resolves.toEqual({ healthy: true });
    expect(request).toHaveBeenCalledWith(
      "https://provider.test/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer public-token",
        }),
      }),
    );
  });

  it("does not retry permanent provider errors", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", request);
    await expect(
      fetchIntegrationJson(config, "/incidents", {
        retries: 3,
        retryDelayMs: 1,
      }),
    ).rejects.toThrow("[401]");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("exhausts bounded retries for transient failures", async () => {
    const request = vi
      .fn()
      .mockImplementation(
        async () => new Response("unavailable", { status: 503 }),
      );
    vi.stubGlobal("fetch", request);
    await expect(
      fetchIntegrationJson(config, "/incidents", {
        retries: 2,
        retryDelayMs: 1,
      }),
    ).rejects.toThrow("[503]");
    expect(request).toHaveBeenCalledTimes(2);
  });
});
