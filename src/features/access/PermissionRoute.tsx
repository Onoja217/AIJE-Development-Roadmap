import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "./AccessProvider";
import type { Permission } from "./types";

interface PermissionRouteProps {
  children: ReactNode;
  anyOf?: Permission[];
  platformOnly?: boolean;
}

export function PermissionRoute({
  children,
  anyOf = [],
  platformOnly = false,
}: PermissionRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading, error, platformAdmin, hasPermission } = useAccess();

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Checking permissions"
          role="status"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const allowed = platformOnly
    ? platformAdmin
    : anyOf.length === 0 ||
      anyOf.some((permission) => hasPermission(permission));

  if (!allowed || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-3 p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className="text-sm text-muted-foreground">
              {error ??
                "Your role does not include permission to open this area. Ask an organization administrator if you need access."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
