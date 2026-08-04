import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { ScanEye, UserSearch, ShieldAlert, Cpu, Activity, WifiOff, Pause, Play } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Slider } from "@/components/ui/slider";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { useCameras } from "@/hooks/useCameras";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getDetectionStatsSnapshot,
  subscribeDetectionStats,
  type DetectionStat,
} from "@/lib/detectionStats";

function useDetectionStats(): DetectionStat[] {
  return useSyncExternalStore(
    subscribeDetectionStats,
    getDetectionStatsSnapshot,
    () => [] as DetectionStat[],
  );
}

const PAUSE_KEY = (name: string) => `aije.detection.paused.${name}`;

function isPaused(name: string) {
  return localStorage.getItem(PAUSE_KEY(name)) === "1";
}
function setPaused(name: string, paused: boolean) {
  if (paused) localStorage.setItem(PAUSE_KEY(name), "1");
  else localStorage.removeItem(PAUSE_KEY(name));
}

export default function DetectionManager() {
  const { user } = useAuth();
  const { cameras } = useCameras();
  const stats = useDetectionStats();
  const [zoneHitsToday, setZoneHitsToday] = useState(0);
  const [pausedTick, setPausedTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    supabase
      .from("alert_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("sensor_type", "person_zone")
      .gte("created_at", since.toISOString())
      .then(({ count }) => setZoneHitsToday(count ?? 0));

    const ch = supabase
      .channel("detection-manager-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_history", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { sensor_type?: string };
          if (row?.sensor_type === "person_zone") setZoneHitsToday((c) => c + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  // Merge registered cameras with live stats so paused/offline cameras still show
  const merged = (cameras ?? []).map((cam) => {
    const live = stats.find((s) => s.cameraName === cam.name);
    return {
      id: cam.id,
      name: cam.name,
      live,
      paused: isPaused(cam.name),
      streamType: cam.stream_type,
      enabled: cam.enabled,
    };
  });

  const activeFeeds = stats.length;
  const totalPersons = stats.reduce((sum, s) => sum + (s.enabled ? s.personCount : 0), 0);
  const avgFps =
    stats.length > 0
      ? Math.round(
          (stats.reduce((sum, s) => sum + s.fps, 0) / stats.length) * 10,
        ) / 10
      : 0;

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="rounded-lg bg-primary/10 p-2 glow-primary">
            <ScanEye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Detection Manager</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Central AI Operations
            </p>
          </div>
        </motion.div>

        {/* Aggregate cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Activity className="h-4 w-4 text-primary" />}
            label="Active Feeds"
            value={`${activeFeeds}/${cameras?.length ?? 0}`}
          />
          <StatCard
            icon={<UserSearch className="h-4 w-4 text-destructive" />}
            label="Persons in Frame"
            value={totalPersons.toString()}
          />
          <StatCard
            icon={<Cpu className="h-4 w-4 text-accent-foreground" />}
            label="Avg AI FPS"
            value={avgFps.toFixed(1)}
          />
          <StatCard
            icon={<ShieldAlert className="h-4 w-4 text-warning" />}
            label="Zone Hits Today"
            value={zoneHitsToday.toString()}
          />
        </div>

        {/* Per-camera grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            Cameras
          </h3>
          {merged.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No cameras registered yet. Add one from the Control Panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {merged.map((cam) => (
                <CameraOpsCard
                  key={cam.id}
                  cam={cam}
                  onToggle={() => {
                    setPaused(cam.name, !cam.paused);
                    setPausedTick((t) => t + 1);
                  }}
                />
              ))}
            </div>
          )}
          <p className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest pt-2">
            * Live AI telemetry is reported only while a camera feed is open on this device.
            Pausing here prevents new detections from starting when the feed mounts.
          </p>
        </div>
        <span className="hidden">{pausedTick}</span>
      </main>
      <BottomNav />
    </div>
  );
}

function StatCard({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function CameraOpsCard({
  cam, onToggle,
}: {
  cam: {
    id: string;
    name: string;
    live?: DetectionStat;
    paused: boolean;
    streamType: string | null;
    enabled: boolean;
  };
  onToggle: () => void;
}) {
  const live = cam.live;
  const isLive = !!live;
  const isDetecting = !!live?.enabled;
  const stale = live && Date.now() - live.lastDetectionAt > 5000;

  const [confidence, setConfidence] = useState<number>(() => {
    const val = localStorage.getItem(`aije.detection.confidence.${cam.name}`);
    return val ? parseFloat(val) : 0.70;
  });

  const handleConfidenceChange = (val: number[]) => {
    const newVal = val[0];
    setConfidence(newVal);
    localStorage.setItem(`aije.detection.confidence.${cam.name}`, newVal.toString());
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                !cam.enabled
                  ? "bg-muted-foreground"
                  : !isLive
                  ? "bg-muted-foreground/40"
                  : isDetecting && !stale
                  ? "bg-success animate-pulse"
                  : "bg-warning"
              }`}
            />
            <h4 className="font-semibold truncate">{cam.name}</h4>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {cam.streamType ?? "webcam"} · {isLive ? (isDetecting ? "AI active" : "feed open") : "feed closed"}
          </p>
        </div>
        <button
          onClick={onToggle}
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            cam.paused
              ? "bg-warning/20 text-warning hover:bg-warning/30"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
          title={cam.paused ? "Resume detection" : "Pause detection (per camera)"}
        >
          {cam.paused ? (
            <span className="flex items-center gap-1"><Play className="h-3 w-3" /> Paused</span>
          ) : (
            <span className="flex items-center gap-1"><Pause className="h-3 w-3" /> Active</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Persons" value={isLive ? String(live.personCount) : "—"} />
        <Metric label="AI FPS" value={isLive ? live.fps.toFixed(1) : "—"} />
        <Metric label="Zone" value={live?.zoneArmed ? "ARMED" : "off"} />
      </div>

      <div className="pt-2 border-t border-border/40 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          <span>Confidence Threshold</span>
          <span className="text-primary font-bold">{Math.round(confidence * 100)}%</span>
        </div>
        <Slider
          value={[confidence]}
          onValueChange={handleConfidenceChange}
          min={0.50}
          max={0.95}
          step={0.05}
          className="py-1"
        />
      </div>

      {live?.modelLoading && (
        <p className="flex items-center gap-1 text-[10px] font-mono text-primary">
          <Cpu className="h-3 w-3 animate-pulse" /> Loading AI model in worker…
        </p>
      )}
      {live && live.online === false && (
        <p className="flex items-center gap-1 text-[10px] font-mono text-warning">
          <WifiOff className="h-3 w-3" /> Offline — queueing
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/40 px-2 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
