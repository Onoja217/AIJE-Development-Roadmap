import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

type Level = "secure" | "elevated" | "high" | "critical";

interface ThreatLevelProps {
  level: Level;
  confidence: number;
  lastScan: string;
}

const config: Record<Level, { label: string; icon: typeof ShieldCheck; color: string; bg: string; glow: string }> = {
  secure: { label: "SECURE", icon: ShieldCheck, color: "text-success", bg: "bg-success/10", glow: "glow-accent" },
  elevated: { label: "ELEVATED", icon: ShieldQuestion, color: "text-warning", bg: "bg-warning/10", glow: "glow-warning" },
  high: { label: "HIGH RISK", icon: ShieldAlert, color: "text-threat-high", bg: "bg-threat-high/10", glow: "glow-warning" },
  critical: { label: "CRITICAL", icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", glow: "glow-danger" },
};

export function ThreatLevel({ level, confidence, lastScan }: ThreatLevelProps) {
  const { label, icon: Icon, color, bg, glow } = config[level];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-xl border border-border p-6 ${bg} ${glow}`}
    >
      <div className="absolute inset-0 scan-line pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Icon className={`h-12 w-12 ${color} ${level === "critical" ? "animate-pulse-glow" : ""}`} />
        <h3 className={`mt-3 font-mono text-2xl font-bold tracking-widest ${color}`}>{label}</h3>
        <p className="mt-2 text-sm text-muted-foreground">AI Threat Assessment</p>
        <div className="mt-4 w-full">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>ML Confidence</span>
            <span className="font-mono">{confidence}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full ${level === "secure" ? "bg-success" : level === "elevated" ? "bg-warning" : "bg-destructive"}`}
            />
          </div>
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">Last scan: {lastScan}</p>
      </div>
    </motion.div>
  );
}
