import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "./AccessProvider";
import { getPostLoginPath } from "./roleRouting";

export function RoleLanding() {
  const { user, loading: authLoading } = useAuth();
  const { loading, platformAdmin, organizations, activeOrganization } =
    useAccess();

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Selecting your workspace"
          role="status"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Navigate
      to={getPostLoginPath(
        platformAdmin,
        organizations,
        activeOrganization?.id,
      )}
      replace
    />
  );
}
