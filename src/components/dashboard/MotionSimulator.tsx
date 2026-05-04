import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, XCircle, Camera, Bell, Play, Square, Zap, Wind } from "lucide-react";
import { LiveCameraFeed } from "@/components/dashboard/LiveCameraFeed";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Phase = "idle" | "normal" | "intrusion" | "spam";

const SIM_CAMERA_NAME = "Simulator Cam";

const PHASES: Record<Phase, { label: string; level: number; icon: typeof Wind; tone: string }> = {
  idle: { label: "Idle (0)", level: 0, icon: Square, tone: "text-muted-foreground" },
  normal: { label: "Normal (5)", level: 5, icon: Wind, tone: "text-success" },
  intrusion: { label: "Intrusion (35)", level: 35, icon: Zap, tone: "text-destructive" },
  spam: { label: "Sustained (50)", level: 50, icon: Activity, tone: "text-warning" },
};

interface CheckRow {
  key: string;
  label: string;
  pass: boolean | null; // null = pending
  detail?: string;
}

export function MotionSimulator() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [running, setRunning] = useState(false);
  const [pulseLevel, setPulseLevel] = useState(0);

  // Counters scoped to current run
  const [alertCount, setAlertCount] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const runStartRef = useRef<number>(Date.now());
  const lastAlertAtRef = useRef<number>(0);

  // Pulse engine — feeds discrete "events" so the engine's debounce trips
  useEffect(() => {
    if (!running) {
      setPulseLevel(0);
      return;
    }
    const target = PHASES[phase].level;
    if (target === 0) {
      setPulseLevel(0);
      return;
    }
    // Alternate target ↔ 0 every ~1.8s so the engine sees discrete events
    let high = true;
    setPulseLevel(target);
    const id = setInterval(() => {
      high = !high;
      setPulseLevel(high ? target : 0);
    }, 1800);
    return () => clearInterval(id);
  }, [running, phase]);

  // Subscribe to alert_history + camera_media for THIS user, for the current run window
  useEffect(() => {
    if (!user) return;
    const alertChan = supabase
      .channel(`sim-alerts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_history", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { created_at: string; message?: string };
          const t = new Date(row.created_at).getTime();
          if (running && t >= runStartRef.current && row.message?.includes(SIM_CAMERA_NAME)) {
            setAlertCount((n) => n + 1);
            lastAlertAtRef.current = Date.now();
          }
        }
      )
      .subscribe();

    const mediaChan = supabase
      .channel(`sim-media-${user.id}`)
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
      supabase.removeChannel(alertChan);
      supabase.removeChannel(mediaChan);
    };
  }, [user, running]);

  const startRun = (next: Phase) => {
    runStartRef.current = Date.now();
    lastAlertAtRef.current = 0;
    setAlertCount(0);
    setSnapshotCount(0);
    setPhase(next);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setPhase("idle");
  };

  // Live validation against the four AEGIS criteria
  const elapsedMs = running ? Date.now() : 0;
  const checks: CheckRow[] = (() => {
    if (phase === "normal") {
      return [
        {
          key: "no-alert-normal",
          label: "No alert during normal movement",
          pass: alertCount === 0,
          detail:
            alertCount === 0
              ? "Engine correctly suppressed sub-threshold motion."
              : `Got ${alertCount} unexpected alert(s).`,
        },
        {
          key: "no-snap-normal",
          label: "No snapshot during normal movement",
          pass: snapshotCount === 0,
          detail: snapshotCount === 0 ? "No snapshots fired." : `Got ${snapshotCount} unexpected snapshot(s).`,
        },
      ];
    }
    if (phase === "intrusion" || phase === "spam") {
      const sinceAlertMs = lastAlertAtRef.current ? Date.now() - lastAlertAtRef.current : Infinity;
      return [
        {
          key: "alert-fired",
          label: "Alert fired during intrusion",
          pass: alertCount > 0 ? true : null,
          detail:
            alertCount > 0 ? `${alertCount} alert(s) recorded.` : "Waiting for engine to trigger…",
        },
        {
          key: "snapshot-fired",
          label: "Snapshot triggered",
          pass: snapshotCount > 0 ? true : null,
          detail:
            snapshotCount > 0
              ? `${snapshotCount} snapshot(s) uploaded.`
              : "Waiting for auto-snapshot…",
        },
        {
          key: "no-spam",
          label: "No spam alerts after first trigger",
          // Once we have at least one alert and 12s pass with no new alerts, mark pass.
          // If alerts keep firing within <5s gap → fail.
          pass:
            alertCount === 0
              ? null
              : alertCount <= 2 && sinceAlertMs > 12_000
              ? true
              : alertCount > 4
              ? false
              : null,
          detail:
            alertCount === 0
              ? "Pending first alert."
              : alertCount > 4
              ? `Throttle leak: ${alertCount} alerts in run.`
              : sinceAlertMs > 12_000
              ? `Throttled — quiet for ${Math.round(sinceAlertMs / 1000)}s after ${alertCount} alert(s).`
              : `${alertCount} alert(s); waiting to confirm cooldown holds…`,
        },
      ];
    }
    return [];
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="rounded-lg p-2.5 bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Motion Simulator</h3>
          <p className="text-xs text-muted-foreground">
            Inject synthetic motion and validate alert + snapshot behavior in real time
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono ${
            running
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {running ? "● RUNNING" : "○ IDLE"}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Phase controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(PHASES) as Phase[]).map((p) => {
            const meta = PHASES[p];
            const Icon = meta.icon;
            const active = running && phase === p;
            return (
              <button
                key={p}
                onClick={() => (p === "idle" ? stop() : startRun(p))}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : meta.tone}`} />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Live preview wired to simulated input */}
        <div className="rounded-lg overflow-hidden border border-border">
          <LiveCameraFeed
            cameraName={SIM_CAMERA_NAME}
            simulatedMotionLevel={running ? pulseLevel : null}
          />
        </div>

        {/* Live counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Injected</p>
            <p className="text-lg font-mono font-bold text-foreground">{pulseLevel}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Bell className="h-3 w-3" /> Alerts
            </p>
            <p className="text-lg font-mono font-bold text-destructive">{alertCount}</p>
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
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Live validation — {phase}
              </p>
              {checks.map((c) => {
                const Icon =
                  c.pass === true ? CheckCircle2 : c.pass === false ? XCircle : Activity;
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
                      {c.detail && (
                        <p className="text-xs text-muted-foreground">{c.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-muted-foreground">
          Tip: <span className="font-mono">Normal</span> stays under the engine's threshold (8).{" "}
          <span className="font-mono">Intrusion</span> and <span className="font-mono">Sustained</span>{" "}
          cross the event threshold (18) and pulse on a {`~`}1.8s cycle so each high spike registers
          as a discrete motion event.
        </p>
      </div>
    </motion.div>
  );
}
