import type { IntegrationEndpointConfig } from "./integrationTypes";

interface FetchOptions {
  /** Hard timeout per attempt. */
  timeoutMs?: number;
  /** Total attempts including the first one. */
  retries?: number;
  /** Base delay for exponential backoff. */
  retryDelayMs?: number;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 4xx responses (except 408/429) are permanent — retrying cannot help. */
function isRetryableStatus(status: number) {
  if (status === 408 || status === 429) return true;
  return status >= 500;
}

/**
 * Fetch JSON from a configured integration endpoint with a hard timeout and
 * exponential-backoff retries for transient network/server failures.
 */
export async function fetchIntegrationJson<TResponse>(
  config: IntegrationEndpointConfig,
  path: string,
  options: number | FetchOptions = {}
): Promise<TResponse> {
  const {
    timeoutMs = 10_000,
    retries = 3,
    retryDelayMs = 500,
  } = typeof options === "number" ? { timeoutMs: options } : options;

  if (!config.baseUrl) {
    throw new Error("No base URL configured for this integration");
  }

  let lastError: Error = new Error("Integration request failed");

  for (let attempt = 0; attempt < Math.max(1, retries); attempt += 1) {
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
        const error = new Error(`[${response.status}] ${body.slice(0, 300)}`);

        if (!isRetryableStatus(response.status)) throw error;

        lastError = error;
      } else {
        return (await response.json()) as TResponse;
      }
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error("Unknown network error");

      // Permanent HTTP failures are rethrown immediately.
      if (/^\[4\d\d\]/.test(normalized.message) && !/\[408\]|\[429\]/.test(normalized.message)) {
        throw normalized;
      }

      lastError = normalized;
    } finally {
      clearTimeout(timer);
    }

    const isLastAttempt = attempt === Math.max(1, retries) - 1;
    if (!isLastAttempt) {
      await sleep(retryDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}
