import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function BillingCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const reference = params.get("reference") || params.get("trxref");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      return;
    }
    supabase.functions
      .invoke("paystack-verify", { body: { reference } })
      .then(({ data, error }) => {
        if (error || !data?.success) setStatus("failed");
        else setStatus("success");
      })
      .catch(() => setStatus("failed"));
  }, [reference]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Verifying payment…</h1>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Subscription active</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Your plan is live. You can now spin up deployments and unlock premium features.
            </p>
            <div className="flex gap-2 mt-6">
              <Button asChild className="flex-1">
                <Link to="/deployments">Manage deployments</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">Dashboard</Link>
              </Button>
            </div>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Payment not verified</h1>
            <p className="text-muted-foreground text-sm mt-2">
              We couldn't confirm your payment. If you were charged, it will be refunded automatically.
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate("/pricing")}>
              Try again
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
