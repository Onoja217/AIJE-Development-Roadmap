import type { IntegrationEndpointConfig } from "./integrationTypes";

/** Fetch JSON from a configured integration endpoint with a hard timeout. */
export async function fetchIntegrationJson<TResponse>(
  config: IntegrationEndpointConfig,
  path: string,
  timeoutMs = 10_000
): Promise<TResponse> {
  if (!config.baseUrl) {
    throw new Error("No base URL configured for this integration");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        ...(config.publicToken
          ? { Authorization: `Bearer ${config.publicToken}` }
          : {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`[${response.status}] ${body.slice(0, 300)}`);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timer);
  }
}
