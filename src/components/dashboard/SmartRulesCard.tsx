import { motion } from "framer-motion";
import { Brain, Camera, Clock, Repeat, Sparkles, WifiOff, Wifi } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useSmartRules } from "@/hooks/useSmartRules";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useEffect, useState } from "react";
import { getQueueSize } from "@/hooks/useOfflineQueue";

export function SmartRulesCard() {
  const { user } = useAuth();
  const { config, update, loading } = useSmartRules(user);
  const online = useNetworkStatus();
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const tick = () => getQueueSize().then(setQueueSize);
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [online]);

  if (loading || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="rounded-lg p-2.5 bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Smart Motion Rules</h3>
          <p className="text-xs text-muted-foreground">Decide what counts as suspicious</p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono ${
            online
              ? "bg-success/10 text-success border border-success/20"
              : "bg-warning/10 text-warning border border-warning/20"
          }`}
          title={queueSize ? `${queueSize} alerts queued` : ""}
        >
          {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {online ? "ONLINE" : `OFFLINE${queueSize ? ` • ${queueSize}` : ""}`}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* Ignore normal movement */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Ignore normal movement</p>
            <p className="text-xs text-muted-foreground">Skip everyday low-level activity</p>
          </div>
          <Switch
            checked={config.ignore_normal_movement}
            onCheckedChange={(v) => update({ ignore_normal_movement: v })}
          />
        </div>

        {/* Odd hours */}
        <div className="space-y-3 rounded-lg bg-secondary/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <p className="text-sm font-medium text-foreground">Movement at odd hours</p>
            </div>
            <Switch
              checked={config.odd_hours_enabled}
              onCheckedChange={(v) => update({ odd_hours_enabled: v })}
            />
          </div>
          {config.odd_hours_enabled && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Start</p>
                <select
                  value={config.odd_hours_start}
                  onChange={(e) => update({ odd_hours_start: parseInt(e.target.value) })}
                  className="w-full rounded-md bg-background border border-border px-2 py-1 text-xs font-mono text-foreground"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">End</p>
                <select
                  value={config.odd_hours_end}
                  onChange={(e) => update({ odd_hours_end: parseInt(e.target.value) })}
                  className="w-full rounded-md bg-background border border-border px-2 py-1 text-xs font-mono text-foreground"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Repeated motion */}
        <div className="space-y-3 rounded-lg bg-secondary/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Repeated motion</p>
            </div>
            <Switch
              checked={config.repeated_motion_enabled}
              onCheckedChange={(v) => update({ repeated_motion_enabled: v })}
            />
          </div>
          {config.repeated_motion_enabled && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">Events to trigger</span>
                  <span className="font-mono text-primary">{config.repeated_motion_count}</span>
                </div>
                <Slider
                  min={2}
                  max={10}
                  step={1}
                  value={[config.repeated_motion_count]}
                  onValueChange={([v]) => update({ repeated_motion_count: v })}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">Within window</span>
                  <span className="font-mono text-primary">
                    {Math.round(config.repeated_motion_window_sec / 60)} min
                  </span>
                </div>
                <Slider
                  min={60}
                  max={1800}
                  step={60}
                  value={[config.repeated_motion_window_sec]}
                  onValueChange={([v]) => update({ repeated_motion_window_sec: v })}
                />
              </div>
            </>
          )}
        </div>

        {/* Unknown pattern */}
        <div className="space-y-3 rounded-lg bg-secondary/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-foreground">Unknown pattern</p>
            </div>
            <Switch
              checked={config.unknown_pattern_enabled}
              onCheckedChange={(v) => update({ unknown_pattern_enabled: v })}
            />
          </div>
          {config.unknown_pattern_enabled && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground">Sensitivity</span>
                <span className="font-mono text-destructive">{config.unknown_pattern_sensitivity}%</span>
              </div>
              <Slider
                min={20}
                max={100}
                step={5}
                value={[config.unknown_pattern_sensitivity]}
                onValueChange={([v]) => update({ unknown_pattern_sensitivity: v })}
              />
              <p className="text-[10px] text-muted-foreground pt-1">
                Learns typical motion per hour. Higher = stricter deviation alerts.
                Baseline hours learned: {Object.keys(config.baseline).length}/24
              </p>
            </div>
          )}
        </div>

        {/* Auto-snapshot interval */}
        <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Auto-snapshot on alert</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Minimum gap between automatic camera snapshots when an alert fires.
          </p>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[15, 30, 60, 120].map((sec) => {
              const active = config.auto_snapshot_interval_sec === sec;
              return (
                <button
                  key={sec}
                  onClick={() => update({ auto_snapshot_interval_sec: sec })}
                  className={`rounded-md border px-2 py-1.5 text-xs font-mono transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
