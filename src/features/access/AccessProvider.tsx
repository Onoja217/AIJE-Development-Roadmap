import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { acceptPendingInvitations, fetchAccessContext } from "./accessApi";
import type { OrganizationAccess, Permission } from "./types";
import {
  ACTIVE_ORGANIZATION_KEY,
  getStoredActiveOrganizationId,
} from "./accessStorage";
import { hasOrganizationPermission } from "./accessRules";

interface AccessValue {
  loading: boolean;
  error: string | null;
  platformAdmin: boolean;
  organizations: OrganizationAccess[];
  activeOrganization: OrganizationAccess | null;
  setActiveOrganizationId: (organizationId: string) => void;
  hasPermission: (permission: Permission, organizationId?: string) => boolean;
  refresh: () => Promise<void>;
}

const AccessContext = createContext<AccessValue | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationAccess[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(
    getStoredActiveOrganizationId,
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setPlatformAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await acceptPendingInvitations();
      const access = await fetchAccessContext();
      setOrganizations(access.organizations);
      setPlatformAdmin(access.platformAdmin);
      setActiveOrganizationIdState((current) => {
        if (
          current &&
          access.organizations.some((item) => item.id === current)
        ) {
          return current;
        }
        return access.organizations[0]?.id ?? null;
      });
    } catch (accessError) {
      console.error("[access] Failed to load permissions", accessError);
      setError("Your access settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (activeOrganizationId) {
      localStorage.setItem(ACTIVE_ORGANIZATION_KEY, activeOrganizationId);
    } else {
      localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
    }
  }, [activeOrganizationId]);

  const activeOrganization =
    organizations.find((item) => item.id === activeOrganizationId) ?? null;

  const hasPermission = useCallback(
    (permission: Permission, organizationId?: string) => {
      return hasOrganizationPermission({
        platformAdmin,
        organizations,
        activeOrganizationId: activeOrganization?.id,
        organizationId,
        permission,
      });
    },
    [activeOrganization, organizations, platformAdmin],
  );

  const value = useMemo<AccessValue>(
    () => ({
      loading: authLoading || loading,
      error,
      platformAdmin,
      organizations,
      activeOrganization,
      setActiveOrganizationId: setActiveOrganizationIdState,
      hasPermission,
      refresh,
    }),
    [
      activeOrganization,
      authLoading,
      error,
      hasPermission,
      loading,
      organizations,
      platformAdmin,
      refresh,
    ],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess must be used inside AccessProvider");
  return value;
}
