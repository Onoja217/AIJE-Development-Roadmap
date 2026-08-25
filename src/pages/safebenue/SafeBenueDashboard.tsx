import { Link } from "react-router-dom";
import { Activity, MapPinned, RefreshCw, Users } from "lucide-react";
import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";
import { VERIFIED_IDOMA_RESOURCES } from "@/data/verifiedIdomaResources";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

export default function SafeBenueDashboard() {
  const { snapshot, mode, isLoading, isRefreshing, refresh } =
    useCommunityIntegration();
  const health = snapshot?.health.safeBenue;
  const incidents = snapshot?.safeBenue.incidents ?? [];
  const resources = snapshot?.safeBenue.resources ?? [];
  const missingPersons = snapshot?.safeBenue.missingPersons ?? [];

  return (
    <SafeBenueLayout
      title="SafeBenue Zone C Dashboard"
      description="Live operational overview for incidents, emergency resources and missing-person reports across Benue South."
    >
      <section
        className="flex flex-wrap items-center gap-2"
        aria-label="Synchronization status"
      >
        <Badge variant="outline">
          {isLoading
            ? "Synchronising"
            : (health?.state?.replace("_", " ") ?? "Not configured")}
        </Badge>
        <Badge variant="secondary">{mode} mode</Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </Button>
      </section>

      {health?.lastError ? (
        <Alert variant="destructive">
          <AlertTitle>SafeBenue synchronization is degraded</AlertTitle>
          <AlertDescription>{health.lastError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Operational totals"
      >
        {[
          { label: "Live incidents", value: incidents.length, icon: Activity },
          {
            label: "Emergency resources",
            value: resources.length + VERIFIED_IDOMA_RESOURCES.length,
            icon: MapPinned,
          },
          {
            label: "Missing persons",
            value: missingPersons.length,
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
              <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Current incident picture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                No verified Zone C incidents are currently visible through
                SafeBenue.
              </p>
            ) : (
              incidents.slice(0, 5).map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{incident.title}</p>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {incident.location.community ??
                      incident.location.localGovernment ??
                      "Zone C"}
                  </p>
                </div>
              ))
            )}
            <Button asChild variant="outline">
              <Link to={APP_PATHS.incidentReport}>Submit a new report</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Response readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {VERIFIED_IDOMA_RESOURCES.length} independently verified
              facilities are available on the local map. Live operational
              availability remains unconfirmed until SafeBenue publishes
              verified resource updates.
            </p>
            <Button asChild>
              <Link to={APP_PATHS.emergencyResources}>
                Open emergency resource map
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={APP_PATHS.safeBenueWatch}>Open Community Watch</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </SafeBenueLayout>
  );
}
