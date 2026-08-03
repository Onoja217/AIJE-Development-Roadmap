import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, ShieldAlert, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CommunityAlertRow {
  id: string;
  incident_type: string;
  summary: string;
  location: string;
  threat_level: string;
  status: string;
  escalation_level: number | null;
  created_at: string;
}

// Community alert tables may be newer than the generated database types.
const db = supabase;

const threatStyles: Record<string, string> = {
  critical: "border-destructive/40 text-destructive",
  high: "border-destructive/30 text-destructive",
  medium: "border-warning/30 text-warning",
  low: "border-primary/30 text-primary",
};

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CommunityAlertFeed() {
  const [alerts, setAlerts] = useState<CommunityAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await db
        .from("community_alerts")
        .select("id,incident_type,summary,location,threat_level,status,escalation_level,created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!active) return;
      if (error) setUnavailable(true);
      else setAlerts((data ?? []) as CommunityAlertRow[]);
      setLoading(false);
    }

    void load();

    const channel = db
      .channel("home-community-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_alerts" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      active = false;
      db.removeChannel(channel);
    };
  }, []);

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Radio className="h-4 w-4 text-primary" />
          Community Alerts
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{activeCount} active</span>
          <Link to="/community-alerts" className="text-primary hover:underline">
            Manage
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading community alerts…</p>
      ) : unavailable ? (
        <p className="text-sm text-muted-foreground">
          Community alert feed is unavailable. Sign in to view verified alerts.
        </p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No community alerts yet — verified incidents will appear here in real time.
        </p>
      ) : (
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const resolved = alert.status !== "active";
              const tone = resolved
                ? "border-success/30 text-success"
                : threatStyles[alert.threat_level] ?? "border-border text-foreground";
              const Icon = resolved ? CheckCircle2 : ShieldAlert;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-lg border bg-secondary/30 p-3 ${tone.split(" ")[0]}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.split(" ")[1]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {alert.incident_type} · {alert.threat_level}
                      </p>
                      <p className="text-sm leading-snug text-muted-foreground">{alert.summary}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.location}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{timeAgo(alert.created_at)}</span>
                        {!resolved && alert.escalation_level ? (
                          <>
                            <span>•</span>
                            <span>escalation {alert.escalation_level}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
