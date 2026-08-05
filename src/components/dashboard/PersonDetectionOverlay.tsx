import { motion, AnimatePresence } from "framer-motion";
import type { Detection } from "@/hooks/usePersonDetection";

interface Props {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
}

export function PersonDetectionOverlay({ detections, videoWidth, videoHeight }: Props) {
  if (!videoWidth || !videoHeight) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${videoWidth} ${videoHeight}`}
        preserveAspectRatio="none"
      >
        <AnimatePresence>
          {detections.map((d, i) => {
            const [x, y, w, h] = d.bbox;
            const isPerson = d.class === "person";
            const shown = d.avgScore ?? d.score;
            const pending = d.confirmed === false;
            const color = isPerson ? "hsl(var(--destructive))" : "hsl(var(--primary))";
            return (
              <motion.g
                key={`${i}-${Math.round(x)}-${Math.round(y)}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray={pending ? "8 6" : undefined}
                  opacity={pending ? 0.6 : 1}
                  rx={4}
                />
                <rect
                  x={x}
                  y={Math.max(0, y - 22)}
                  width={Math.min(190, w)}
                  height={22}
                  fill={color}
                  opacity={0.85}
                />
                <text
                  x={x + 6}
                  y={Math.max(14, y - 6)}
                  fill="white"
                  fontSize={14}
                  fontFamily="monospace"
                  fontWeight={700}
                >
                  {d.class.toUpperCase()} {d.trackId != null ? `#${d.trackId} ` : ""}{Math.round(shown * 100)}%{pending ? " ?" : ""}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}
