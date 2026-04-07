import { motion, AnimatePresence } from "framer-motion";

interface MotionRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  intensity: number;
}

interface MotionOverlayProps {
  regions: MotionRegion[];
  motionLevel: number;
  enabled: boolean;
}

export function MotionOverlay({ regions, motionLevel, enabled }: MotionOverlayProps) {
  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Motion highlight regions */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1 1" preserveAspectRatio="none">
        <AnimatePresence>
          {regions.map((r, i) => (
            <motion.rect
              key={`${r.x}-${r.y}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={`rgba(239, 68, 68, ${r.intensity * 0.35})`}
              stroke={`rgba(239, 68, 68, ${r.intensity * 0.7})`}
              strokeWidth={0.003}
              rx={0.005}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          ))}
        </AnimatePresence>
      </svg>

      {/* Motion level indicator */}
      {motionLevel > 2 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-md bg-destructive/80 backdrop-blur-sm px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[9px] font-mono text-white font-bold tracking-wider">
            MOTION {Math.round(motionLevel)}%
          </span>
        </div>
      )}
    </div>
  );
}
