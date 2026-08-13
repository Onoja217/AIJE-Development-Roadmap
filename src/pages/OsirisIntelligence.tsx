import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Clock3,
  Crosshair,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Target,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { RoleResourceLinks } from "@/features/access/RoleResourceLinks";
import { useCommunityIntegration } from "@/contexts/CommunityIntegrationContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  OsirisThreatAssessment,
  OsirisThreatLevel,
} from "@/integrations/osiris/types";
import {
  countExpiredAssessments,
  osirisPercentage,
  sortOsirisAssessments,
} from "@/lib/osirisUtils";
import { APP_PATHS } from "@/features/navigation/navigationConfig";

const THREAT_STYLES: Record<OsirisThreatLevel, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-500",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-500",
  elevated: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  guarded: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function locationLabel(assessment: OsirisThreatAssessment) {
  return assessment.location.community ?? assessment.location.address ??
    `${assessment.location.latitude.toFixed(4)}, ${assessment.location.longitude.toFixed(4)}`;
}

export default function OsirisIntelligence() {
  const { snapshot, mode, isLoading, isRefreshing, error, refresh } =
    useCommunityIntegration();
  const [level, setLevel] = useState<OsirisThreatLevel | "all">("all");

  const health = snapshot?.health.osiris;
  const assessments = useMemo(
    () => sortOsirisAssessments(snapshot?.osiris.assessments ?? []),
    [snapshot],
  );
  const hotspots = useMemo(
    () => [...(snapshot?.osiris.hotspots ?? [])].sort(
      (a, b) => b.riskScore - a.riskScore,
    ),
    [snapshot],
  );
  const filtered = level === "all"
    ? assessments
    : assessments.filter((assessment) => assessment.threatLevel === level);
  const criticalCount = assessments.filter(
    (assessment) => ["critical", "high"].includes(assessment.threatLevel),
  ).length;
  const averageConfidence = assessments.length
    ? Math.round(
        assessments.reduce((sum, item) => sum + osirisPercentage(item.confidence), 0) /
          assessments.length,
      )
    : 0;
  const expiredCount = countExpiredAssessments(assessments);
  const connected = health?.state === "connected";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
              <Link to={APP_PATHS.community}>
                <ArrowLeft className="h-4 w-4" /> Community operations
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">Osiris Intelligence</h1>
                <p className="text-sm text-muted-foreground">
                  Prioritized threat assessments, indicators, hotspots and recommended actions.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={connected ? "border-emerald-500/40 text-emerald-500" : ""}>
              <span className={`mr-2 h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              {health?.state?.replace("_", " ") ?? "not configured"}
            </Badge>
            <Badge variant="secondary">{mode} mode</Badge>
            <Button onClick={() => void refresh()} disabled={isRefreshing} size="sm">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {(error || health?.lastError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Osiris synchronization is degraded</AlertTitle>
            <AlertDescription>{health?.lastError ?? error}</AlertDescription>
          </Alert>
        )}
        {expiredCount > 0 && (
          <Alert>
            <Clock3 className="h-4 w-4" />
            <AlertTitle>Stale intelligence requires review</AlertTitle>
            <AlertDescription>
              {expiredCount} assessment{expiredCount === 1 ? " has" : "s have"} passed its validity window.
            </AlertDescription>
          </Alert>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Osiris summary">
          {[
            { label: "Assessments", value: assessments.length, icon: Activity },
            { label: "High priority", value: criticalCount, icon: ShieldAlert },
            { label: "Hotspots", value: hotspots.length, icon: Crosshair },
            { label: "Avg. confidence", value: `${averageConfidence}%`, icon: Target },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
                <Icon className="h-7 w-7 text-primary" />
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="assessments">
          <TabsList>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
            <TabsTrigger value="health">Source health</TabsTrigger>
          </TabsList>

          <TabsContent value="assessments" className="space-y-4">
            <div className="flex flex-wrap gap-2 pt-2" aria-label="Filter by threat level">
              {(["all", "critical", "high", "elevated", "guarded", "low"] as const).map((item) => (
                <Button key={item} size="sm" variant={level === item ? "default" : "outline"} onClick={() => setLevel(item)}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>
            {isLoading ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Loading intelligence…</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No assessments match this filter.</CardContent></Card>
            ) : filtered.map((assessment) => (
              <Card key={assessment.id} className="overflow-hidden">
                <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <Badge variant="outline" className={THREAT_STYLES[assessment.threatLevel]}>{assessment.threatLevel}</Badge>
                    <CardTitle className="text-lg">{assessment.title}</CardTitle>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{locationLabel(assessment)}</p>
                  </div>
                  <div className="grid min-w-44 grid-cols-2 gap-3 text-center">
                    <div><p className="text-xl font-bold">{assessment.threatScore}</p><p className="text-xs text-muted-foreground">Threat score</p></div>
                    <div><p className="text-xl font-bold">{osirisPercentage(assessment.confidence)}%</p><p className="text-xs text-muted-foreground">Confidence</p></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Progress value={assessment.threatScore} className="h-2" />
                  <p className="text-sm leading-6">{assessment.summary}</p>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div><h3 className="mb-2 text-sm font-semibold">Observed indicators</h3><ul className="space-y-2 text-sm text-muted-foreground">{assessment.indicators.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{item}</li>)}</ul></div>
                    <div><h3 className="mb-2 text-sm font-semibold">Recommended actions</h3><ol className="space-y-2 text-sm text-muted-foreground">{assessment.recommendations.map((item, index) => <li key={item} className="flex gap-2"><span className="font-semibold text-primary">{index + 1}.</span>{item}</li>)}</ol></div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-t pt-3 text-xs text-muted-foreground"><span>Generated {formatDate(assessment.generatedAt)}</span><span>Valid until {formatDate(assessment.expiresAt)}</span></div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="hotspots" className="grid gap-4 pt-2 md:grid-cols-2">
            {hotspots.length === 0 ? <Card className="md:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No active hotspots reported.</CardContent></Card> : hotspots.map((hotspot) => (
              <Card key={hotspot.id}>
                <CardHeader className="flex-row items-start justify-between gap-3"><div><Badge variant="outline" className={THREAT_STYLES[hotspot.threatLevel]}>{hotspot.threatLevel}</Badge><CardTitle className="mt-2 text-lg">{hotspot.name}</CardTitle></div><div className="text-right"><p className="text-2xl font-bold">{hotspot.riskScore}</p><p className="text-xs text-muted-foreground">Risk score</p></div></CardHeader>
                <CardContent className="space-y-3"><Progress value={hotspot.riskScore} className="h-2" /><div className="grid grid-cols-3 gap-2 text-center text-sm"><div><p className="font-semibold">{hotspot.incidentCount}</p><p className="text-xs text-muted-foreground">Incidents</p></div><div><p className="font-semibold">{(hotspot.radiusMetres / 1000).toFixed(1)} km</p><p className="text-xs text-muted-foreground">Radius</p></div><div><p className="font-semibold">{hotspot.location.community ?? "Mapped"}</p><p className="text-xs text-muted-foreground">Area</p></div></div><p className="text-xs text-muted-foreground">Updated {formatDate(hotspot.updatedAt)}</p></CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="health" className="pt-2">
            <Card><CardHeader><CardTitle>Integration health</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">State</p><p className="font-semibold capitalize">{health?.state?.replace("_", " ") ?? "Not configured"}</p></div><div><p className="text-xs text-muted-foreground">Records received</p><p className="font-semibold">{health?.recordsReceived ?? 0}</p></div><div><p className="text-xs text-muted-foreground">Last attempt</p><p className="font-semibold">{formatDate(health?.lastSyncAt)}</p></div><div><p className="text-xs text-muted-foreground">Last successful sync</p><p className="font-semibold">{formatDate(health?.lastSuccessfulSyncAt)}</p></div></CardContent></Card>
          </TabsContent>
        </Tabs>
        <RoleResourceLinks />
      </main>
    </div>
  );
}
