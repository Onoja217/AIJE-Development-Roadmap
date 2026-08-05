import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

/**
 * Route guard that requires the signed-in user to hold the `admin` role.
 * The role is verified server-side through the `has_role` security-definer
 * function, so the check cannot be spoofed from the client.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let active = true;

    if (loading) return;
    if (!user) {
      setState("denied");
      return;
    }

    setState("checking");
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (!active) return;
        setState(!error && data === true ? "allowed" : "denied");
      });

    return () => {
      active = false;
    };
  }, [user, loading]);

  if (loading || state === "checking") {
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

  if (state === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-3 p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className="text-sm text-muted-foreground">
              This area is restricted to AIJE administrators. If you believe you
              should have access, contact your system administrator.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}

export default AdminRoute;
