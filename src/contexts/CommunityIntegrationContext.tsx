import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { useCommunityLiveSync } from "@/hooks/useCommunityLiveSync";

type CommunityIntegrationContextValue = ReturnType<
  typeof useCommunityLiveSync
>;

const CommunityIntegrationContext =
  createContext<CommunityIntegrationContextValue | null>(null);

interface CommunityIntegrationProviderProps {
  children: ReactNode;
}

export function CommunityIntegrationProvider({
  children,
}: CommunityIntegrationProviderProps) {
  const integrationState = useCommunityLiveSync();

  return (
    <CommunityIntegrationContext.Provider value={integrationState}>
      {children}
    </CommunityIntegrationContext.Provider>
  );
}

export function useCommunityIntegration(): CommunityIntegrationContextValue {
  const context = useContext(CommunityIntegrationContext);

  if (!context) {
    throw new Error(
      "useCommunityIntegration must be used inside CommunityIntegrationProvider"
    );
  }

  return context;
}
