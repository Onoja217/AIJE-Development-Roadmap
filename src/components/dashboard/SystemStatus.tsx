import { motion } from "framer-motion";
import { Cpu, Wifi, Battery, HardDrive } from "lucide-react";

const metrics = [
  { icon: Cpu, label: "AI Engine", value: "Active", sub: "Latency: 12ms" },
  { icon: Wifi, label: "Network", value: "Stable", sub: "42 nodes connected" },
  { icon: Battery, label: "Power", value: "98%", sub: "Solar backup ready" },
  { icon: HardDrive, label: "Storage", value: "2.4 TB", sub: "14 days retained" },
];

export function SystemStatus() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">System Status</h3>
      <div className="space-y-3">
        {metrics.map(({ icon: Icon, label, value, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3"
          >
            <div className="rounded-md bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="font-mono text-sm text-primary">{value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
