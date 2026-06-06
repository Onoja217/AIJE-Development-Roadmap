import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ArrowLeft, Activity, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Delivery = {
  id: string;
  source: string;
  event_type: string | null;
  reference: string | null;
  attempt: number;
  status: "ok" | "error" | "abandoned" | "invalid_signature";
  latency_ms: number;
  error: string | null;
  delivered_at: string;
};

const WINDOWS = [
  { label: "1h", hours: 1, bucketMin: 5 },
  { label: "24h", hours: 24, bucketMin: 60 },
  { label: "7d", hours: 24 * 7, bucketMin: 360 },
];

const STATUS_COLORS: Record<string, string> = {
  ok: "hsl(var(--success))",
  error: "hsl(var(--destructive))",
  abandoned: "hsl(var(--muted-foreground))",
  invalid_signature: "hsl(var(--warning, 38 92% 50%))",
};

export default function AdminWebhooks() {
  const [windowIdx, setWindowIdx] = useState(1);
  const [rows, setRows] = useState<Delivery[]>([]);
  const [deadLetter, setDeadLetter] = useState<{ status: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const w = WINDOWS[windowIdx];

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - w.hours * 3600_000).toISOString();
    const [{ data: deliv }, { data: dl }] = await Promise.all([
      supabase
        .from("webhook_deliveries")
        .select("*")
        .gte("delivered_at", since)
        .order("delivered_at", { ascending: true })
        .limit(5000),
      supabase.from("webhook_dead_letter").select("status"),
    ]);
    setRows((deliv ?? []) as Delivery[]);
    const counts: Record<string, number> = {};
    (dl ?? []).forEach((r: any) => (counts[r.status] = (counts[r.status] ?? 0) + 1));
    setDeadLetter(Object.entries(counts).map(([status, count]) => ({ status, count })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowIdx]);

  const buckets = useMemo(() => {
    const bucketMs = w.bucketMin * 60_000;
    const now = Date.now();
    const start = now - w.hours * 3600_000;
    const map = new Map<number, { t: number; p50: number[]; p95: number[]; ok: number; error: number; abandoned: number; invalid_signature: number; retries: number }>();
    for (let t = Math.floor(start / bucketMs) * bucketMs; t <= now; t += bucketMs) {
      map.set(t, { t, p50: [], p95: [], ok: 0, error: 0, abandoned: 0, invalid_signature: 0, retries: 0 });
    }
    for (const r of rows) {
      const t = Math.floor(new Date(r.delivered_at).getTime() / bucketMs) * bucketMs;
      const b = map.get(t);
      if (!b) continue;
      b.p50.push(r.latency_ms);
      b.p95.push(r.latency_ms);
      (b as any)[r.status]++;
      if (r.attempt > 1) b.retries++;
    }
    return Array.from(map.values()).map((b) => {
      const sorted = [...b.p50].sort((a, c) => a - c);
      const p = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0);
      return {
        label: new Date(b.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        p50: p(0.5),
        p95: p(0.95),
        ok: b.ok,
        error: b.error,
        abandoned: b.abandoned,
        invalid_signature: b.invalid_signature,
        retries: b.retries,
      };
    });
  }, [rows, w]);

  const totals = useMemo(() => {
    const t = { total: rows.length, ok: 0, error: 0, abandoned: 0, invalid: 0, retries: 0, avgLatency: 0 };
    let sum = 0;
    for (const r of rows) {
      sum += r.latency_ms;
      if (r.status === "ok") t.ok++;
      else if (r.status === "error") t.error++;
      else if (r.status === "abandoned") t.abandoned++;
      else if (r.status === "invalid_signature") t.invalid++;
      if (r.attempt > 1) t.retries++;
    }
    t.avgLatency = rows.length ? Math.round(sum / rows.length) : 0;
    return t;
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <div>
              <h1 className="text-base font-semibold tracking-wide">Webhook Observability</h1>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">paystack · deliveries · retries · dead-letter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {WINDOWS.map((win, i) => (
              <Button
                key={win.label}
                size="sm"
                variant={i === windowIdx ? "default" : "outline"}
                onClick={() => setWindowIdx(i)}
              >
                {win.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Deliveries" value={totals.total} icon={<Activity className="h-4 w-4" />} />
          <Stat label="Avg latency" value={`${totals.avgLatency}ms`} icon={<Activity className="h-4 w-4" />} />
          <Stat label="Succeeded" value={totals.ok} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Stat label="Retries" value={totals.retries} tone="warn" icon={<RefreshCw className="h-4 w-4" />} />
          <Stat label="Errors / abandoned" value={totals.error + totals.abandoned} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>

        <Card title="Delivery latency (p50 / p95)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="ms" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Deliveries by outcome">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="ok" stackId="a" fill={STATUS_COLORS.ok} />
                  <Bar dataKey="error" stackId="a" fill={STATUS_COLORS.error} />
                  <Bar dataKey="abandoned" stackId="a" fill={STATUS_COLORS.abandoned} />
                  <Bar dataKey="invalid_signature" stackId="a" fill={STATUS_COLORS.invalid_signature} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Retry attempts per bucket">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="retries" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card title="Dead-letter queue status">
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="h-56">
              {deadLetter.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No dead-letter entries</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={deadLetter} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80}>
                      {deadLetter.map((d, i) => (
                        <Cell key={i} fill={STATUS_COLORS[d.status] ?? "hsl(var(--muted-foreground))"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {deadLetter.map((d) => (
                <div key={d.status} className="flex justify-between border-b border-border/50 pb-2">
                  <span className="font-mono uppercase tracking-wider text-xs text-muted-foreground">{d.status}</span>
                  <span className="font-mono">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Recent deliveries">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Ref</th>
                  <th className="py-2 pr-3 font-medium">Attempt</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 pr-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().slice(0, 25).map((r) => (
                  <tr key={r.id} className="border-t border-border/50 font-mono">
                    <td className="py-1.5 pr-3 text-muted-foreground">{new Date(r.delivered_at).toLocaleTimeString()}</td>
                    <td className="py-1.5 pr-3">{r.event_type ?? "—"}</td>
                    <td className="py-1.5 pr-3 truncate max-w-[140px]">{r.reference ?? "—"}</td>
                    <td className="py-1.5 pr-3">{r.attempt}</td>
                    <td className="py-1.5 pr-3" style={{ color: STATUS_COLORS[r.status] }}>{r.status}</td>
                    <td className="py-1.5 pr-3">{r.latency_ms}ms</td>
                    <td className="py-1.5 pr-3 text-destructive truncate max-w-[260px]">{r.error ?? ""}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No deliveries in window</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-[11px] font-mono text-muted-foreground">
          Structured JSON logs are also emitted to edge function logs (msg=paystack.webhook.*, paystack.retry.*) for Grafana Loki / Datadog ingestion.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone?: "success" | "warn" | "danger" }) {
  const color =
    tone === "success" ? "text-success" : tone === "warn" ? "text-primary" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className={`mt-1 text-2xl font-mono ${color}`}>{value}</div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}
