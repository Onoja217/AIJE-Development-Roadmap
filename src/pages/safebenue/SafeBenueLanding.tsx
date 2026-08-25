import { Link } from "react-router-dom";
import {
  Activity,
  Bell,
  CloudOff,
  HeartHandshake,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";
import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";
import { VERIFIED_IDOMA_RESOURCES } from "@/data/verifiedIdomaResources";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

const ZONE_C_LGAS = [
  "Ado",
  "Agatu",
  "Apa",
  "Obi",
  "Ogbadibo",
  "Ohimini",
  "Oju",
  "Okpokwu",
  "Otukpo",
] as const;

const pillars = [
  {
    icon: Bell,
    title: "Community-driven early warning",
    description:
      "Residents, watch groups and responders surface threats early so communities can act before an incident escalates.",
  },
  {
    icon: Siren,
    title: "Emergency response",
    description:
      "Coordinated dispatch, live status tracking and direct routing to the nearest available emergency resource.",
  },
  {
    icon: CloudOff,
    title: "Offline-first architecture",
    description:
      "Reports, alerts and resource data are captured locally on-device and synchronised automatically when connectivity returns.",
  },
  {
    icon: HeartHandshake,
    title: "Community resilience",
    description:
      "Shared intelligence, family safety tools and local resource mapping build lasting preparedness across every ward.",
  },
];

export default function SafeBenueLanding() {
  const { snapshot, mode, isLoading, isRefreshing, refresh } =
    useCommunityIntegration();
  const health = snapshot?.health.safeBenue;
  const connected = health?.state === "connected";
  const incidentCount = snapshot?.safeBenue.incidents.length ?? 0;
  const upstreamResourceCount = snapshot?.safeBenue.resources.length ?? 0;
  const missingPersonCount = snapshot?.safeBenue.missingPersons.length ?? 0;
  const resourceCount = upstreamResourceCount + VERIFIED_IDOMA_RESOURCES.length;

  return (
    <SafeBenueLayout
      title="SafeBenue — Idoma Zone C"
      description="Community safety operations for Benue South: early warning, verified local resources, incident reporting and resilience built for low-connectivity communities."
    >
      <section
        className="flex flex-wrap items-center gap-2"
        aria-label="SafeBenue status"
      >
        <Badge
          variant="outline"
          className={connected ? "border-emerald-500/40 text-emerald-500" : ""}
        >
          <span
            className={`mr-2 h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`}
          />
          {isLoading
            ? "Synchronising"
            : (health?.state?.replace("_", " ") ?? "Not configured")}
        </Badge>
        <Badge variant="secondary">{mode} mode</Badge>
        <Badge variant="outline">9 Zone C LGAs</Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </section>

      {health?.lastError ? (
        <Alert variant="destructive">
          <Siren className="h-4 w-4" />
          <AlertTitle>Live SafeBenue data is degraded</AlertTitle>
          <AlertDescription>{health.lastError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Zone C operational summary"
      >
        {[
          { label: "Live incidents", value: incidentCount, icon: Activity },
          { label: "Known resources", value: resourceCount, icon: MapPinned },
          { label: "Missing persons", value: missingPersonCount, icon: Users },
          {
            label: "Verified facilities",
            value: VERIFIED_IDOMA_RESOURCES.length,
            icon: ShieldCheck,
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

      <section
        className="grid gap-4 lg:grid-cols-[1.35fr_1fr]"
        aria-label="SafeBenue operational scope"
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">
              Benue South operational coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              SafeBenue prioritises Idoma communities while covering all nine
              LGAs in Benue South (Zone C). Alerts outside this operating area
              are not promoted as local intelligence.
            </p>
            <div className="flex flex-wrap gap-2">
              {ZONE_C_LGAS.map((lga) => (
                <Badge key={lga} variant="secondary">
                  {lga}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Verified local directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {VERIFIED_IDOMA_RESOURCES.map((resource) => (
              <div
                key={resource.id}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-sm font-semibold">{resource.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {resource.community}, {resource.lga} · independently verified
                </p>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to={APP_PATHS.emergencyResources}>
                Open Zone C resource map
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-4 sm:grid-cols-2"
        aria-label="SafeBenue capabilities"
      >
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card key={pillar.title} className="border-border bg-card">
              <CardHeader className="space-y-3">
                <div className="w-fit rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {pillar.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section
        className="flex flex-wrap gap-3"
        aria-label="SafeBenue quick links"
      >
        <Button asChild>
          <Link to={APP_PATHS.safeBenueDashboard}>
            Open SafeBenue dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={APP_PATHS.incidentReport}>Submit an incident report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={APP_PATHS.safeBenueWatch}>Open Community Watch</Link>
        </Button>
      </section>
    </SafeBenueLayout>
  );
}
