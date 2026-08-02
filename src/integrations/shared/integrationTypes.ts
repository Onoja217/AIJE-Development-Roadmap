export type IntegrationMode = "demo" | "staging" | "live";

export type IntegrationProvider = "safebenue" | "osiris";

export type IntegrationState =
  | "not_configured"
  | "connected"
  | "degraded"
  | "disconnected";

export interface IntegrationEndpointConfig {
  enabled: boolean;
  baseUrl: string | null;
  /** Public/read-only token only. Never put private keys in the client. */
  publicToken: string | null;
}

export interface IntegrationConfiguration {
  mode: IntegrationMode;
  safeBenueEnabled: boolean;
  osirisEnabled: boolean;
  pollingIntervalMs: number;
  safeBenue: IntegrationEndpointConfig;
  osiris: IntegrationEndpointConfig;
}

export interface IntegrationHealth {
  provider: IntegrationProvider;
  state: IntegrationState;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  recordsReceived: number;
}

export interface IntegrationResult<TData> {
  data: TData;
  health: IntegrationHealth;
}
