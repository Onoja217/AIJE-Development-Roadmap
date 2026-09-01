import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarRange,
  Camera,
  Download,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserSearch,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildAlertAnalytics,
  filterAlertEvents,
  seedAlertEvents,
  type AlertFilters,
  type AlertStatus,
} from "@/lib/alertDashboard";

const severityColors: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#facc15",
  Low: "#22c55e",
};

const statusPalette = ["#8b5cf6", "#3b82f6", "#22c55e"];

export default function AlertDashboard() {
  const [filters, setFilters] = useState<AlertFilters>({
    severity: "All",
    status: "All",
  });
  const [selectedId, setSelectedId] = useState<string>(seedAlertEvents[0]?.id ?? "");

  const cameraOptions = useMemo(
    () => Array.from(new Set(seedAlertEvents.map((event) => event.cameraName))).sort(),
    [],
  );

  const filteredAlerts = useMemo(
    () => filterAlertEvents(seedAlertEvents, filters),
    [filters],
  );

  const analytics = useMemo(
    () => buildAlertAnalytics(filteredAlerts),
    [filteredAlerts],
  );

  const selectedAlert =
    filteredAlerts.find((event) => event.id === selectedId) ?? filteredAlerts[0] ?? seedAlertEvents[0];

  const totalAlerts = filteredAlerts.length;
  const criticalAlerts = filteredAlerts.filter((alert) => alert.severity === "Critical").length;
  const openAlerts = filteredAlerts.filter((alert) => alert.status === "Open").length;
  const avgThreatScore =
    totalAlerts > 0
      ? Math.round(
          filteredAlerts.reduce((sum, alert) => sum + alert.threatScore, 0) / totalAlerts,
        )
      : 0;

  const handleExportCsv = () => {
    const csvRows = [
      [
        "id",
        "camera",
        "timestamp",
        "severity",
        "threatScore",
        "aiConfidence",
        "smartRule",
        "detectionType",
        "status",
      ],
      ...filteredAlerts.map((alert) => [
        alert.id,
        alert.cameraName,
        alert.timestamp,
        alert.severity,
        String(alert.threatScore),
        String(alert.aiConfidence),
        alert.smartRule,
        alert.detectionType,
        alert.status,
      ]),
    ];

    const csv = csvRows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-je-alerts.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AIJE Intelligent Alert Dashboard</h1>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Security event review and analysis
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="default" onClick={handleExportPdf} className="gap-2">
              <FileTextIcon />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<BellRing className="h-4 w-4" />} label="Total alerts" value={String(totalAlerts)} />
          <MetricCard icon={<ShieldAlert className="h-4 w-4" />} label="Critical" value={String(criticalAlerts)} tone="danger" />
          <MetricCard icon={<Zap className="h-4 w-4" />} label="Open incidents" value={String(openAlerts)} tone="warning" />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Avg threat score" value={`${avgThreatScore}%`} tone="success" />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filters
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Search</label>
              <Input
                placeholder="Camera or rule"
                value={filters.camera ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    camera: event.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Camera</label>
              <Select
                value={filters.camera ?? "all"}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    camera: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All cameras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cameras</SelectItem>
                  {cameraOptions.map((camera) => (
                    <SelectItem key={camera} value={camera}>
                      {camera}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Date</label>
              <Input
                type="date"
                value={filters.date ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    date: event.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Threat level</label>
              <Select
                value={filters.severity ?? "All"}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    severity: value === "All" ? "All" : (value as any),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Status</label>
              <Select
                value={filters.status ?? "All"}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    status: value === "All" ? "All" : (value as AlertStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Investigating">Investigating</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Person detection</label>
              <Select
                value={filters.personDetection === undefined ? "all" : String(filters.personDetection)}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    personDetection: value === "all" ? undefined : value === "true",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Detected</SelectItem>
                  <SelectItem value="false">Not detected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 xl:col-span-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Motion detection</label>
              <Select
                value={filters.motionDetection === undefined ? "all" : String(filters.motionDetection)}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    motionDetection: value === "all" ? undefined : value === "true",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Detected</SelectItem>
                  <SelectItem value="false">Not detected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarRange className="h-4 w-4 text-primary" />
                Alert timeline
              </CardTitle>
              <span className="text-xs text-muted-foreground">{filteredAlerts.length} events</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No alerts match the current filter set.
                </div>
              ) : (
                filteredAlerts
                  .slice()
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => setSelectedId(alert.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:border-primary/50 ${
                        selectedAlert?.id === alert.id ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="mt-1 rounded-lg bg-muted p-2 text-primary">
                        <AlertTriangle className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{alert.cameraName}</span>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ backgroundColor: `${severityColors[alert.severity]}20`, color: severityColors[alert.severity] }}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{alert.status}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {alert.threatScore}</span>
                          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {alert.detectionType}</span>
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Alert detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAlert ? (
                <>
                  <img
                    src={selectedAlert.snapshotUrl}
                    alt={`${selectedAlert.cameraName} alert snapshot`}
                    className="h-48 w-full rounded-xl object-cover"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailBlock label="Camera name" value={selectedAlert.cameraName} icon={<Camera className="h-4 w-4" />} />
                    <DetailBlock label="Threat score" value={`${selectedAlert.threatScore}%`} icon={<Target className="h-4 w-4" />} />
                    <DetailBlock label="AI confidence" value={`${selectedAlert.aiConfidence}%`} icon={<Sparkles className="h-4 w-4" />} />
                    <DetailBlock label="Detection type" value={selectedAlert.detectionType} icon={<UserSearch className="h-4 w-4" />} />
                  </div>

                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Smart rule triggered</p>
                    <p className="mt-2 text-sm font-medium">{selectedAlert.smartRule}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                  Select an alert to inspect the event details.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" />
                Alerts per day
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.alertsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Camera className="h-4 w-4 text-primary" />
                Alerts by camera
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byCamera}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="camera" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Threat level distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.threatLevels} dataKey="count" nameKey="level" innerRadius={45} outerRadius={80} paddingAngle={4}>
                    {analytics.threatLevels.map((entry) => (
                      <Cell key={entry.level} fill={severityColors[entry.level] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Most active hours
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.mostActiveHours}>
                  <defs>
                    <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(value) => `${value}:00`} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#22c55e" fillOpacity={1} fill="url(#activityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneStyles = {
    default: "border-border bg-card text-foreground",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneStyles[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <div className="rounded-lg bg-background/60 p-2">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function DetailBlock({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function FileTextIcon() {
  return <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-white/20 text-[10px] font-bold text-primary-foreground">PDF</span>;
}
