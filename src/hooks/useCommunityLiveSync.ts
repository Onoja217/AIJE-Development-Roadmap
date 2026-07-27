import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { integrationConfig } from "@/integrations/shared/integrationConfig";

import {
  synchronizeCommunityIntegrations,
  type CommunityIntegrationSnapshot,
} from "@/services/integrationSync";

interface CommunityLiveSyncState {
  snapshot: CommunityIntegrationSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export function useCommunityLiveSync() {
  const [state, setState] =
    useState<CommunityLiveSyncState>({
      snapshot: null,
      isLoading: true,
      isRefreshing: false,
      error: null,
    });

  const mountedRef = useRef(true);

  const synchronize = useCallback(
    async (manual = false) => {
      setState((current) => ({
        ...current,
        isLoading: current.snapshot === null,
        isRefreshing: manual || current.snapshot !== null,
        error: null,
      }));

      try {
        const snapshot =
          await synchronizeCommunityIntegrations();

        if (!mountedRef.current) {
          return;
        }

        setState({
          snapshot,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          isRefreshing: false,
          error:
            error instanceof Error
              ? error.message
              : "Community synchronization failed",
        }));
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    void synchronize();

    const intervalId = window.setInterval(() => {
      void synchronize();
    }, integrationConfig.pollingIntervalMs);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [synchronize]);

  return {
    ...state,
    mode: integrationConfig.mode,
    refresh: () => synchronize(true),
  };
}
