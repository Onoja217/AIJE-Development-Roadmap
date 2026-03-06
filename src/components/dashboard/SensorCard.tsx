import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SensorCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  status: "online" | "warning" | "alert" | "offline";
  detail?: string;
}

const statusStyles = {
  online: "border-success/30 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
  alert: "border-destructive/30 bg-destructive/5",
  offline: "border-muted-foreground/20 bg-muted/30",
};

const dotStyles = {
  online: "bg-success",
  warning: "bg-warning",
  alert: "bg-destructive",
  offline: "bg-muted-foreground",
};

export function SensorCard({ icon: Icon, label, value, status, detail }: SensorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-4 transition-all ${statusStyles[status]}`}
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-secondary p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${dotStyles[status]} ${status === "alert" ? "animate-pulse-glow" : ""}`} />
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </motion.div>
  );
}
