import { motion } from "framer-motion";

interface Zone {
  id: string;
  name: string;
  status: "secure" | "warning" | "alert";
  sensors: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const zones: Zone[] = [
  { id: "A", name: "North Perimeter", status: "alert", sensors: 8, x: 10, y: 5, w: 35, h: 25 },
  { id: "B", name: "East Wing", status: "warning", sensors: 12, x: 55, y: 5, w: 35, h: 25 },
  { id: "C", name: "Main Hall", status: "secure", sensors: 16, x: 10, y: 38, w: 80, h: 25 },
  { id: "D", name: "Rear Entry", status: "alert", sensors: 6, x: 10, y: 70, w: 35, h: 25 },
  { id: "E", name: "South Gate", status: "secure", sensors: 10, x: 55, y: 70, w: 35, h: 25 },
];

const zoneColors = {
  secure: { fill: "rgba(46, 160, 110, 0.15)", stroke: "rgba(46, 160, 110, 0.5)", text: "text-success" },
  warning: { fill: "rgba(217, 152, 11, 0.15)", stroke: "rgba(217, 152, 11, 0.5)", text: "text-warning" },
  alert: { fill: "rgba(220, 60, 60, 0.15)", stroke: "rgba(220, 60, 60, 0.5)", text: "text-destructive" },
};

export function ZoneMap() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Zone Overview</h3>
        <div className="flex items-center gap-3 text-xs">
          {(["secure", "warning", "alert"] as const).map(s => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${s === "secure" ? "bg-success" : s === "warning" ? "bg-warning" : "bg-destructive"}`} />
              <span className="capitalize text-muted-foreground">{s}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="relative w-full aspect-[2/1] grid-overlay rounded-lg border border-border overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {zones.map((zone, i) => (
            <motion.g key={zone.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
              <rect
                x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                fill={zoneColors[zone.status].fill}
                stroke={zoneColors[zone.status].stroke}
                strokeWidth="0.5"
                rx="1"
              />
            </motion.g>
          ))}
        </svg>
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: `${zone.x + zone.w / 2}%`,
              top: `${zone.y + zone.h / 2}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className={`font-mono text-xs font-bold ${zoneColors[zone.status].text}`}>
              {zone.id}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{zone.name}</span>
            <span className="text-[9px] text-muted-foreground font-mono">{zone.sensors} sensors</span>
          </div>
        ))}
      </div>
    </div>
  );
}
