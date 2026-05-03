import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSystemState } from "@/hooks/useSystemState";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldOff, ShieldCheck, ChevronLeft, Camera, Bell,
  BellOff, BellRing, Smartphone, Wifi, WifiOff, Volume2, VolumeX,
  Lock, Unlock, Eye, EyeOff, RefreshCw, Signal
} from "lucide-react";
import { LiveCameraFeed } from "@/components/dashboard/LiveCameraFeed";
import { CameraGallery } from "@/components/dashboard/CameraGallery";
import { CameraManager } from "@/components/dashboard/CameraManager";
import { useCameras } from "@/hooks/useCameras";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type ArmState = "disarmed" | "armed-home" | "armed-away";

const armConfig: Record<ArmState, { label: string; icon: typeof Shield; color: string; glow: string; bg: string }> = {
  disarmed: { label: "Disarmed", icon: ShieldOff, color: "text-muted-foreground", glow: "", bg: "bg-muted" },
  "armed-home": { label: "Armed Home", icon: ShieldCheck, color: "text-warning", glow: "glow-warning", bg: "bg-warning/10" },
  "armed-away": { label: "Armed Away", icon: Shield, color: "text-destructive", glow: "glow-danger", bg: "bg-destructive/10" },
};

const cameras = [
  { id: 1, name: "Front Door", status: "online", zone: "Entrance" },
  { id: 2, name: "Backyard", status: "online", zone: "Perimeter" },
  { id: 3, name: "Garage", status: "offline", zone: "Garage" },
  { id: 4, name: "Living Room", status: "online", zone: "Interior" },
  { id: 5, name: "Driveway", status: "online", zone: "Perimeter" },
  { id: 6, name: "Side Gate", status: "online", zone: "Perimeter" },
];

export default function ControlPanel() {
  const { user } = useAuth();
  const { armState, updateArmState } = useSystemState(user);
  const { cameras } = useCameras();
  const [transitioning, setTransitioning] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true, sound: true, critical: true, motion: true, vibration: false, access: true,
  });
  const [sensitivity, setSensitivity] = useState([70]);
  const [selectedCam, setSelectedCam] = useState<string | null>(null);
  const [showDeviceCam, setShowDeviceCam] = useState(false);

  const handleArm = (state: ArmState) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => { updateArmState(state); setTransitioning(false); }, 1200);
  };

  const current = armConfig[armState];
  const CurrentIcon = current.icon;

  return (
    <div className="min-h-screen bg-background grid-overlay">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
        <Link to="/" className="rounded-lg bg-secondary p-2 hover:bg-secondary/80 transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground tracking-tight">Control Panel</h1>
        </div>
      </header>

      <main className="p-4 max-w-[800px] mx-auto space-y-5 pb-20">
        {/* Arm/Disarm */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">System Control</h2>

          <div className="flex flex-col items-center gap-4">
            <motion.div
              className={cn("relative rounded-full p-6 transition-all duration-500", current.bg, current.glow)}
              animate={transitioning ? { scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 1.2 }}
            >
              {transitioning ? (
                <RefreshCw className="h-12 w-12 text-primary animate-spin" />
              ) : (
                <CurrentIcon className={cn("h-12 w-12 transition-colors", current.color)} />
              )}
              {armState !== "disarmed" && !transitioning && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-card animate-pulse" />
              )}
            </motion.div>

            <div className="text-center">
              <p className={cn("text-lg font-bold", transitioning ? "text-muted-foreground" : current.color)}>
                {transitioning ? "Transitioning..." : current.label}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {transitioning ? "Please wait" : armState === "disarmed" ? "System is not armed" : "All sensors active"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              {(Object.keys(armConfig) as ArmState[]).map((state) => {
                const cfg = armConfig[state];
                const Icon = cfg.icon;
                const active = armState === state && !transitioning;
                return (
                  <button
                    key={state}
                    onClick={() => handleArm(state)}
                    disabled={transitioning}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                      transitioning && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="leading-tight text-center">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* CCTV Cameras Manager */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">CCTV Cameras</h2>
          <CameraManager />
        </motion.section>

        {/* Camera Feeds */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Live Feeds</h2>
            <span className="text-xs text-success font-mono">
              {cameras.filter(c => c.enabled).length}/{cameras.length} Active
            </span>
          </div>

          <AnimatePresence mode="wait">
            {selectedCam !== null || showDeviceCam ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              >
                {showDeviceCam ? (
                  <LiveCameraFeed
                    cameraName="Device Camera"
                    onClose={() => setShowDeviceCam(false)}
                  />
                ) : (() => {
                  const cam = cameras.find(c => c.id === selectedCam);
                  if (!cam) return null;
                  return (
                    <LiveCameraFeed
                      cameraName={cam.name}
                      streamUrl={cam.stream_url}
                      streamType={cam.stream_type}
                      onClose={() => setSelectedCam(null)}
                    />
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                <button
                  onClick={() => setShowDeviceCam(true)}
                  className="relative aspect-video rounded-lg border border-border bg-muted hover:border-primary/50 cursor-pointer overflow-hidden transition-all group"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Camera className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-medium text-foreground">Device Camera</span>
                    <span className="text-[9px] font-mono text-muted-foreground">PHONE / WEBCAM</span>
                  </div>
                </button>
                {cameras.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => cam.enabled && setSelectedCam(cam.id)}
                    className={cn(
                      "relative aspect-video rounded-lg border overflow-hidden transition-all group",
                      cam.enabled
                        ? "border-border bg-muted hover:border-primary/50 cursor-pointer"
                        : "border-border/50 bg-muted/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      {cam.enabled ? (
                        <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-[10px] font-medium text-foreground truncate max-w-full px-2">{cam.name}</span>
                      <div className="flex items-center gap-1">
                        {cam.enabled ? (
                          <Signal className="h-2.5 w-2.5 text-success" />
                        ) : (
                          <WifiOff className="h-2.5 w-2.5 text-destructive" />
                        )}
                        <span className={cn("text-[9px] font-mono", cam.enabled ? "text-success" : "text-muted-foreground")}>
                          {cam.stream_type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {cameras.length === 0 && (
                  <p className="col-span-full text-center text-xs text-muted-foreground py-4">
                    No CCTV cameras yet. Add one above to start streaming.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Saved Media */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Saved Media</h2>
          <CameraGallery />
        </motion.section>

        {/* Notification Settings */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Notification Settings</h2>

          <div className="space-y-4">
            {[
              { key: "push" as const, label: "Push Notifications", desc: "Receive alerts on your device", iconOn: Bell, iconOff: BellOff },
              { key: "sound" as const, label: "Alert Sounds", desc: "Play sound on notifications", iconOn: Volume2, iconOff: VolumeX },
              { key: "critical" as const, label: "Critical Alerts", desc: "Override Do Not Disturb", iconOn: BellRing, iconOff: BellOff },
              { key: "motion" as const, label: "Motion Alerts", desc: "Camera motion detection", iconOn: Eye, iconOff: EyeOff },
              { key: "vibration" as const, label: "Vibration Alerts", desc: "Ground vibration anomalies", iconOn: Wifi, iconOff: WifiOff },
              { key: "access" as const, label: "Access Alerts", desc: "Door & window events", iconOn: Lock, iconOff: Unlock },
            ].map((item) => {
              const enabled = notifications[item.key];
              const Icon = enabled ? item.iconOn : item.iconOff;
              return (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg p-2", enabled ? "bg-primary/10" : "bg-muted")}>
                      <Icon className={cn("h-4 w-4", enabled ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => setNotifications((n) => ({ ...n, [item.key]: v }))}
                  />
                </div>
              );
            })}

            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Alert Sensitivity</p>
                <span className="text-xs font-mono text-primary">{sensitivity[0]}%</span>
              </div>
              <Slider value={sensitivity} onValueChange={setSensitivity} max={100} min={10} step={5} className="w-full" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">Low</span>
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
