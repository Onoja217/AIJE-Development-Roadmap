import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2, XCircle, Activity, Bell, Camera, Timer, Play, Square } from "lucide-react";
import { LiveCameraFeed } from "@/components/dashboard/LiveCameraFeed";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SIM_CAMERA_NAME = "Zone Simulator Cam";
const COOLDOWN_OPTIONS = [10, 30, 60, 120] as const;
const SEVERITY_OPTIONS = ["info", "warning", "danger"] as const;
type Severity = (typeof SEVERITY_OPTIONS)[number];

type AlertRow = { created_at: string; severity: string; message?: string };

interface Check {
  key: string;
  label: string;
  pass: boolean | null;
  detail?: string;
}

export function RestrictedZoneSimulator() {
  const { user } = useAuth();
  const [cooldownSec, setCooldownSec] = useState<number>(30);
  const [severity, setSeverity] = useState<Severity>("danger");
  const [running, setRunning] = useState(false);
  const [intrusionPulse, setIntrusionPulse] = useState(false);

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const runStartRef = useRef<number>(Date.now());

  // Pulse "person in zone" on a 1.2s on / 0.6s off cycle while running, so we
  // emit many would-be intrusion frames and the cooldown/severity logic is exercised.
  useEffect(() => {
    if (!running) {
      setIntrusionPulse(false);
      return;
    }
    let on = true;
    setIntrusionPulse(true);
    const id = setInterval(() => {
      on = !on;
      setIntrusionPulse(on);
    }, on ? 1200 : 600);
    return () => clearInterval(id);
  }, [running]);

  // Subscribe to alert + snapshot inserts scoped to this run + this sim camera
  useEffect(() => {
    if (!user) return;
    const a = supabase
      .channel(`zonesim-alerts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_history", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as AlertRow & { sensor_type: string };
          const t = new Date(row.created_at).getTime();
          if (
            running &&
            t >= runStartRef.current &&
            row.sensor_type === "person_zone" &&
            row.message?.includes(SIM_CAMERA_NAME)
          ) {
            setAlerts((prev) => [...prev, row]);
          }
        }
      )
      .subscribe();

    const m = supabase
      .channel(`zonesim-media-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "camera_media", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { created_at: string; camera_name: string; media_type: string };
          const t = new Date(row.created_at).getTime();
          if (
            running &&
            t >= runStartRef.current &&
            row.camera_name === SIM_CAMERA_NAME &&
            row.media_type === "snapshot"
          ) {
            setSnapshotCount((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(a);
      supabase.removeChannel(m);
    };
  }, [user, running]);

  const start = () => {
    runStartRef.current = Date.now();
    setAlerts([]);
    setSnapshotCount(0);
    setRunning(true);
  };
  const stop = () => setRunning(false);

  // Compute observed gap between consecutive alerts vs configured cooldown.
  const gaps = alerts
    .map((a) => new Date(a.created_at).getTime())
    .sort((x, y) => x - y)
    .map((t, i, arr) => (i === 0 ? null : t - arr[i - 1]))
    .filter((g): g is number => g !== null);
  const minGapMs = gaps.length ? Math.min(...gaps) : null;
  const cooldownMs = cooldownSec * 1000;

  const allMatchSeverity = alerts.length > 0 && alerts.every((a) => a.severity === severity);

  const checks: Check[] = !running && alerts.length === 0
    ? []
    : [
        {
          key: "fired",
          label: "Intrusion alert fires while zone is armed",
          pass: alerts.length > 0 ? true : null,
          detail:
            alerts.length > 0
              ? `${alerts.length} alert(s) recorded for "${SIM_CAMERA_NAME}".`
              : "Waiting for first zone alert…",
        },
        {
          key: "cooldown",
          label: `Cooldown ≥ ${cooldownSec}s honored between alerts`,
          pass:
            alerts.length < 2
              ? null
              : minGapMs !== null && minGapMs + 250 >= cooldownMs, // 250ms tolerance
          detail:
            alerts.length < 2
              ? "Need at least 2 alerts to measure gap…"
              : `Min observed gap: ${(minGapMs! / 1000).toFixed(1)}s`,
        },
        {
          key: "severity",
          label: `Alerts use "${severity}" severity`,
          pass: alerts.length === 0 ? null : allMatchSeverity,
          detail:
            alerts.length === 0
              ? "Pending first alert."
              : allMatchSeverity
              ? `All ${alerts.length} alert(s) at "${severity}".`
              : `Mismatch: got ${[...new Set(alerts.map((a) => a.severity))].join(", ")}`,
        },
        {
          key: "snapshot",
          label: "Auto-snapshot triggered on intrusion",
          pass: alerts.length === 0 ? null : snapshotCount > 0,
          detail:
            snapshotCount > 0
              ? `${snapshotCount} snapshot(s) uploaded.`
              : "Waiting for snapshot…",
        },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="rounded-lg p-2.5 bg-warning/10">
          <ShieldAlert className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Restricted-Zone Simulator</h3>
          <p className="text-xs text-muted-foreground">
            Inject synthetic person-in-zone events and validate cooldown + severity in real time
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono ${
            running
              ? "bg-warning/10 text-warning border border-warning/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {running ? "● RUNNING" : "○ IDLE"}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Tuning controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" /> Cooldown
            </label>
            <Select value={String(cooldownSec)} onValueChange={(v) => setCooldownSec(parseInt(v, 10))}>
              <SelectTrigger className="h-9 text-xs font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COOLDOWN_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}s</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Severity
            </label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger className="h-9 text-xs font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Run controls */}
        <div className="flex gap-2">
          <button
            onClick={running ? stop : start}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              running
                ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {running ? <><Square className="h-4 w-4" /> Stop simulation</> : <><Play className="h-4 w-4" /> Start simulation</>}
          </button>
        </div>

        {/* Live preview wired to simulated zone intrusion + the chosen overrides */}
        <div className="rounded-lg overflow-hidden border border-border">
          <LiveCameraFeed
            cameraName={SIM_CAMERA_NAME}
            zoneCooldownSec={cooldownSec}
            zoneAlertSeverity={severity}
            simulatedZoneIntrusion={running && intrusionPulse}
          />
        </div>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pulse</p>
            <p className="text-lg font-mono font-bold text-foreground">{intrusionPulse ? "IN" : "—"}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Bell className="h-3 w-3" /> Alerts
            </p>
            <p className="text-lg font-mono font-bold text-warning">{alerts.length}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Camera className="h-3 w-3" /> Snapshots
            </p>
            <p className="text-lg font-mono font-bold text-primary">{snapshotCount}</p>
          </div>
        </div>

        {/* Validation checks */}
        <AnimatePresence mode="wait">
          {checks.length > 0 && (
            <motion.div
              key={`${cooldownSec}-${severity}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Live validation — cooldown {cooldownSec}s · severity {severity}
              </p>
              {checks.map((c) => {
                const Icon = c.pass === true ? CheckCircle2 : c.pass === false ? XCircle : Activity;
                const tone =
                  c.pass === true
                    ? "text-success"
                    : c.pass === false
                    ? "text-destructive"
                    : "text-muted-foreground animate-pulse";
                return (
                  <div
                    key={c.key}
                    className="flex items-start gap-3 rounded-md border border-border bg-secondary/20 p-3"
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${tone}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{c.label}</p>
                      {c.detail && <p className="text-xs text-muted-foreground">{c.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-muted-foreground">
          Tip: Lower cooldown (10s) to verify fast re-fires, raise to 60–120s to confirm spam suppression.
          Severity changes propagate to the in-app alert and the persisted alert history row.
        </p>
      </div>
    </motion.div>
  );
}
