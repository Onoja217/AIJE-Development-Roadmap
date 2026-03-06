import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { ThreatLevelType } from "@/hooks/useLiveSensorData";

interface ThreatLevelProps {
  level: ThreatLevelType;
  confidence: number;
  lastScan: string;
}

const config: Record<ThreatLevelType, { label: string; icon: typeof ShieldCheck; color: string; bg: string; glow: string; bar: string }> = {
  secure: { label: "SECURE", icon: ShieldCheck, color: "text-success", bg: "bg-success/10", glow: "glow-accent", bar: "bg-success" },
  elevated: { label: "ELEVATED", icon: ShieldQuestion, color: "text-warning", bg: "bg-warning/10", glow: "glow-warning", bar: "bg-warning" },
  high: { label: "HIGH RISK", icon: ShieldAlert, color: "text-threat-high", bg: "bg-threat-high/10", glow: "glow-warning", bar: "bg-threat-high" },
  critical: { label: "CRITICAL", icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", glow: "glow-danger", bar: "bg-destructive" },
};

export function ThreatLevel({ level, confidence, lastScan }: ThreatLevelProps) {
  const { label, icon: Icon, color, bg, glow, bar } = config[level];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-xl border border-border p-6 transition-all duration-700 ${bg} ${glow}`}
    >
      <div className="absolute inset-0 scan-line pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={level}
            initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotate: 10 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
          >
            <Icon className={`h-12 w-12 ${color} ${level === "critical" ? "animate-pulse-glow" : ""}`} />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.h3
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={`mt-3 font-mono text-2xl font-bold tracking-widest ${color}`}
          >
            {label}
          </motion.h3>
        </AnimatePresence>
        <p className="mt-2 text-sm text-muted-foreground">AI Threat Assessment</p>
        <div className="mt-4 w-full">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>ML Confidence</span>
            <motion.span
              key={confidence}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono"
            >
              {confidence}%
            </motion.span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
            <motion.div
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full transition-colors duration-700 ${bar}`}
            />
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={lastScan}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 font-mono text-xs text-muted-foreground"
          >
            Last scan: {lastScan}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
