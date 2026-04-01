import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, XCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { SensorData } from "@/hooks/useLiveSensorData";
import { useAlertNotifications } from "@/hooks/useAlertNotifications";

type Severity = "info" | "warning" | "danger" | "resolved";

interface Alert {
  id: string;
  time: string;
  message: string;
  zone: string;
  severity: Severity;
}

const severityConfig: Record<Severity, { icon: typeof Info; color: string; border: string }> = {
  info: { icon: Info, color: "text-primary", border: "border-primary/20" },
  warning: { icon: AlertTriangle, color: "text-warning", border: "border-warning/20" },
  danger: { icon: XCircle, color: "text-destructive", border: "border-destructive/20" },
  resolved: { icon: CheckCircle2, color: "text-success", border: "border-success/20" },
};

const zones = ["Zone A - North Wall", "Zone B - East Wing", "Zone C - South Gate", "Zone D - Rear Entry", "Zone A - Parking", "Zone B - Corridor"];

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function pickZone() {
  return zones[Math.floor(Math.random() * zones.length)];
}

function generateAlertsFromSensors(sensors: SensorData): Alert[] {
  const alerts: Alert[] = [];
  const t = formatTime();

  if (sensors.vibration.status === "alert") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `Vibration anomaly detected — ${sensors.vibration.detail}`, zone: pickZone(), severity: "danger" });
  } else if (sensors.vibration.status === "warning") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `Vibration elevated at ${sensors.vibration.value}`, zone: pickZone(), severity: "warning" });
  }

  if (sensors.motion.status === "alert") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `High motion activity — ${sensors.motion.value} detected`, zone: pickZone(), severity: "danger" });
  } else if (sensors.motion.status === "warning") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `Motion sensor triggered — ${sensors.motion.detail}`, zone: pickZone(), severity: "warning" });
  }

  if (sensors.movement.status === "alert") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `Perimeter breach — movement detected`, zone: pickZone(), severity: "danger" });
  }

  if (sensors.access.status === "alert") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `Door tamper attempt — ${sensors.access.detail}`, zone: pickZone(), severity: "danger" });
  }

  if (sensors.cameras.status === "warning") {
    alerts.push({ id: crypto.randomUUID(), time: t, message: `Camera feed issue — ${sensors.cameras.detail}`, zone: pickZone(), severity: "info" });
  }

  if (alerts.length === 0) {
    alerts.push({ id: crypto.randomUUID(), time: t, message: "All sensors nominal — routine scan completed", zone: pickZone(), severity: "resolved" });
  }

  return alerts;
}

interface AlertFeedProps {
  sensors?: SensorData;
}

export function AlertFeed({ sensors }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { notify } = useAlertNotifications();
  const prevSensorsRef = useRef<SensorData | undefined>();

  useEffect(() => {
    if (!sensors || sensors === prevSensorsRef.current) return;
    prevSensorsRef.current = sensors;
    const newAlerts = generateAlertsFromSensors(sensors);
    setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));

    const critical = newAlerts.find(a => a.severity === "danger");
    const warning = newAlerts.find(a => a.severity === "warning");
    if (critical) {
      notify(critical.message, "danger");
    } else if (warning) {
      notify(warning.message, "warning");
    }
  }, [sensors, notify]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Alert Feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          LIVE
        </span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {alerts.map((alert) => {
            const { icon: Icon, color, border } = severityConfig[alert.severity];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 rounded-lg border ${border} bg-secondary/30 p-3`}
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{alert.time}</span>
                    <span>•</span>
                    <span>{alert.zone}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
