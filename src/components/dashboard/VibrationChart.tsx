import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useMemo } from "react";

export function VibrationChart() {
  const data = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < 60; i++) {
      let val = Math.sin(i * 0.3) * 15 + 30;
      if (i > 35 && i < 45) val += Math.random() * 40 + 20; // anomaly spike
      else val += Math.random() * 8;
      points.push(val);
    }
    return points;
  }, []);

  const maxVal = Math.max(...data);
  const svgWidth = 600;
  const svgHeight = 100;
  const stepX = svgWidth / (data.length - 1);

  const pathD = data
    .map((v, i) => {
      const x = i * stepX;
      const y = svgHeight - (v / maxVal) * svgHeight * 0.85;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vibration Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-mono text-destructive">
            Anomaly Detected
          </span>
        </div>
      </div>
      <div className="relative w-full h-28 overflow-hidden rounded-lg">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="vibGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(185, 80%, 50%)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(185, 80%, 50%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={areaD}
            fill="url(#vibGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
          <motion.path
            d={pathD}
            fill="none"
            stroke="hsl(185, 80%, 50%)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          {/* Anomaly region highlight */}
          <rect x={35 * stepX} y={0} width={10 * stepX} height={svgHeight} fill="hsl(0, 75%, 55%)" fillOpacity="0.08" />
        </svg>
        <div className="absolute bottom-1 right-2 text-[10px] font-mono text-muted-foreground">
          60s window • 100 Hz sampling
        </div>
      </div>
    </div>
  );
}
