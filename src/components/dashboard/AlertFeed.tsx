import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, XCircle, CheckCircle2 } from "lucide-react";

type Severity = "info" | "warning" | "danger" | "resolved";

interface Alert {
  id: string;
  time: string;
  message: string;
  zone: string;
  severity: Severity;
}

const alerts: Alert[] = [
  { id: "1", time: "00:12:04", message: "Vibration anomaly detected — pattern matches drilling signature", zone: "Zone A - North Wall", severity: "danger" },
  { id: "2", time: "00:11:38", message: "Motion sensor triggered — unusual movement near window", zone: "Zone B - East Wing", severity: "warning" },
  { id: "3", time: "00:10:55", message: "Perimeter sensor check completed successfully", zone: "Zone C - South Gate", severity: "resolved" },
  { id: "4", time: "00:09:22", message: "Ground vibration spike — classified as vehicle passing", zone: "Zone A - Parking", severity: "info" },
  { id: "5", time: "00:08:01", message: "Door tamper attempt detected — force signature identified", zone: "Zone D - Rear Entry", severity: "danger" },
  { id: "6", time: "00:06:44", message: "Camera feed reconnected after brief interruption", zone: "Zone B - Corridor", severity: "info" },
];

const severityConfig: Record<Severity, { icon: typeof Info; color: string; border: string }> = {
  info: { icon: Info, color: "text-primary", border: "border-primary/20" },
  warning: { icon: AlertTriangle, color: "text-warning", border: "border-warning/20" },
  danger: { icon: XCircle, color: "text-destructive", border: "border-destructive/20" },
  resolved: { icon: CheckCircle2, color: "text-success", border: "border-success/20" },
};

export function AlertFeed() {
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
        <AnimatePresence>
          {alerts.map((alert, i) => {
            const { icon: Icon, color, border } = severityConfig[alert.severity];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
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
