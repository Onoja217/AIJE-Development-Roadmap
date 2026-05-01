import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Vibrate, Move, Footprints, Camera, ThermometerSun, Lock,
  Settings2, Activity, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartRulesCard } from "@/components/dashboard/SmartRulesCard";

interface SensorConfig {
  id: string;
  name: string;
  icon: typeof Vibrate;
  enabled: boolean;
  sensitivity: number;
  thresholdWarning: number;
  thresholdCritical: number;
  zone: string;
  status: "online" | "warning" | "alert" | "offline";
  lastReading: string;
  unit: string;
  history: number[];
}

const initialSensors: SensorConfig[] = [
  { id: "vib", name: "Vibration Sensor", icon: Vibrate, enabled: true, sensitivity: 70, thresholdWarning: 3.5, thresholdCritical: 5.0, zone: "Zone A - North Wall", status: "online", lastReading: "2.1", unit: "Hz", history: [1.2, 1.8, 2.1, 1.5, 3.2, 2.8, 1.9, 2.4, 5.1, 3.8, 2.2, 1.7, 2.0, 2.5, 1.6, 4.2, 2.3, 1.8, 2.7, 3.1] },
  { id: "mot", name: "Motion Detector", icon: Move, enabled: true, sensitivity: 60, thresholdWarning: 2, thresholdCritical: 5, zone: "Zone B - East Wing", status: "warning", lastReading: "3", unit: "events", history: [0, 1, 0, 2, 1, 0, 3, 1, 0, 5, 2, 1, 0, 1, 2, 0, 1, 7, 2, 1] },
  { id: "mov", name: "Movement Tracker", icon: Footprints, enabled: true, sensitivity: 80, thresholdWarning: 1, thresholdCritical: 1, zone: "Zone C - South Gate", status: "online", lastReading: "Normal", unit: "", history: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
  { id: "cam", name: "Camera System", icon: Camera, enabled: true, sensitivity: 50, thresholdWarning: 22, thresholdCritical: 20, zone: "All Zones", status: "online", lastReading: "24/24", unit: "feeds", history: [24, 24, 23, 24, 24, 24, 22, 24, 24, 24, 23, 24, 24, 24, 24, 24, 23, 24, 24, 24] },
  { id: "env", name: "Environment Sensor", icon: ThermometerSun, enabled: true, sensitivity: 40, thresholdWarning: 28, thresholdCritical: 35, zone: "Zone A - Interior", status: "online", lastReading: "21", unit: "°C", history: [20, 20, 21, 21, 22, 21, 20, 21, 22, 23, 22, 21, 20, 21, 21, 22, 21, 20, 21, 22] },
  { id: "acc", name: "Access Control", icon: Lock, enabled: true, sensitivity: 90, thresholdWarning: 1, thresholdCritical: 1, zone: "Zone D - Rear Entry", status: "alert", lastReading: "Breached", unit: "", history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
];

const statusBadge: Record<string, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-success/10 text-success border-success/20" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning border-warning/20" },
  alert: { label: "Alert", className: "bg-destructive/10 text-destructive border-destructive/20" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground border-border" },
};

function MiniChart({ data, warningThreshold, criticalThreshold, maxVal }: { data: number[]; warningThreshold: number; criticalThreshold: number; maxVal?: number }) {
  const max = maxVal ?? (Math.max(...data, criticalThreshold) * 1.2 || 1);
  const w = 300;
  const h = 80;
  const step = w / (data.length - 1);

  const pathD = data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / max) * h * 0.9}`).join(" ");
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  const warnY = h - (warningThreshold / max) * h * 0.9;
  const critY = h - (criticalThreshold / max) * h * 0.9;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(185, 80%, 50%)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(185, 80%, 50%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGrad)" />
      <line x1={0} y1={warnY} x2={w} y2={warnY} stroke="hsl(38, 92%, 50%)" strokeWidth="1" strokeDasharray="4 3" opacity={0.5} />
      <line x1={0} y1={critY} x2={w} y2={critY} stroke="hsl(0, 75%, 55%)" strokeWidth="1" strokeDasharray="4 3" opacity={0.5} />
      <path d={pathD} fill="none" stroke="hsl(185, 80%, 50%)" strokeWidth="2" />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (v / max) * h * 0.9}
          r={2}
          fill={v >= criticalThreshold ? "hsl(0, 75%, 55%)" : v >= warningThreshold ? "hsl(38, 92%, 50%)" : "hsl(185, 80%, 50%)"}
        />
      ))}
    </svg>
  );
}

function SensorPanel({ sensor, onUpdate }: { sensor: SensorConfig; onUpdate: (s: SensorConfig) => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = sensor.icon;
  const badge = statusBadge[sensor.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`rounded-lg p-2.5 ${sensor.enabled ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`h-5 w-5 ${sensor.enabled ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{sensor.name}</h3>
            <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{sensor.zone}</p>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-mono font-bold text-foreground">{sensor.lastReading} {sensor.unit}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-5 space-y-6">
              <Tabs defaultValue="config" className="w-full">
                <TabsList className="bg-secondary/50 w-full grid grid-cols-2">
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-5 pt-4">
                  {/* Enable/Disable */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Sensor Active</p>
                      <p className="text-xs text-muted-foreground">Enable or disable this sensor</p>
                    </div>
                    <Switch
                      checked={sensor.enabled}
                      onCheckedChange={(checked) => onUpdate({ ...sensor, enabled: checked })}
                    />
                  </div>

                  {/* Sensitivity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Sensitivity</p>
                      <span className="text-xs font-mono text-primary">{sensor.sensitivity}%</span>
                    </div>
                    <Slider
                      value={[sensor.sensitivity]}
                      onValueChange={([v]) => onUpdate({ ...sensor, sensitivity: v })}
                      min={10}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Low</span><span>High</span>
                    </div>
                  </div>

                  {/* Warning Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Warning Threshold</p>
                      <span className="text-xs font-mono text-warning">{sensor.thresholdWarning} {sensor.unit}</span>
                    </div>
                    <Slider
                      value={[sensor.thresholdWarning]}
                      onValueChange={([v]) => onUpdate({ ...sensor, thresholdWarning: v })}
                      min={0}
                      max={sensor.thresholdCritical * 2 || 10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>

                  {/* Critical Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Critical Threshold</p>
                      <span className="text-xs font-mono text-destructive">{sensor.thresholdCritical} {sensor.unit}</span>
                    </div>
                    <Slider
                      value={[sensor.thresholdCritical]}
                      onValueChange={([v]) => onUpdate({ ...sensor, thresholdCritical: v })}
                      min={0}
                      max={sensor.thresholdCritical * 3 || 15}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Last 20 Readings</p>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warning" />Warning</span>
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />Critical</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <MiniChart
                      data={sensor.history}
                      warningThreshold={sensor.thresholdWarning}
                      criticalThreshold={sensor.thresholdCritical}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-secondary/40 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Min</p>
                      <p className="text-sm font-mono font-bold text-foreground">{Math.min(...sensor.history).toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Max</p>
                      <p className="text-sm font-mono font-bold text-foreground">{Math.max(...sensor.history).toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Avg</p>
                      <p className="text-sm font-mono font-bold text-foreground">{(sensor.history.reduce((a, b) => a + b, 0) / sensor.history.length).toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Alerts</p>
                      <p className="text-sm font-mono font-bold text-destructive">{sensor.history.filter(v => v >= sensor.thresholdCritical).length}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SensorManagement() {
  const [sensors, setSensors] = useState(initialSensors);

  const updateSensor = (updated: SensorConfig) => {
    setSensors(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const activeCount = sensors.filter(s => s.enabled).length;
  const alertCount = sensors.filter(s => s.status === "alert").length;

  return (
    <div className="min-h-screen bg-background grid-overlay">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4">
        <Link to="/" className="rounded-lg bg-secondary p-2 hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Sensor Management</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Configuration & Monitoring</p>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-[900px] mx-auto space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sensors</p>
            <p className="text-2xl font-mono font-bold text-foreground mt-1">{sensors.length}</p>
          </div>
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
            <p className="text-2xl font-mono font-bold text-success mt-1">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Alerts</p>
            <p className="text-2xl font-mono font-bold text-destructive mt-1">{alertCount}</p>
          </div>
        </div>

        {/* Smart Motion Rules */}
        <SmartRulesCard />

        {/* Sensor list */}
        <div className="space-y-3">
          {sensors.map(sensor => (
            <SensorPanel key={sensor.id} sensor={sensor} onUpdate={updateSensor} />
          ))}
        </div>
      </main>
    </div>
  );
}
