// In-memory pub/sub for live per-camera detection telemetry.
// Live camera feeds push updates; the Detection Manager subscribes.
export interface DetectionStat {
  cameraName: string;
  enabled: boolean;
  personCount: number;
  fps: number;
  lastDetectionAt: number;
  zoneArmed: boolean;
  /** Mean smoothed confidence of confirmed detections (0-1). */
  avgConfidence: number;
  /** Configured minimum confidence threshold for this camera (0-1). */
  minConfidence: number;
  online: boolean;
  modelLoading: boolean;
}

const stats = new Map<string, DetectionStat>();
const listeners = new Set<() => void>();
let snapshot: DetectionStat[] = [];

function rebuildSnapshot() {
  snapshot = Array.from(stats.values());
  listeners.forEach((l) => l());
}

export function updateDetectionStat(name: string, patch: Partial<DetectionStat>) {
  const prev =
    stats.get(name) ||
    ({
      cameraName: name,
      enabled: false,
      personCount: 0,
      fps: 0,
      lastDetectionAt: 0,
      zoneArmed: false,
      avgConfidence: 0,
      minConfidence: 0,
      online: true,
      modelLoading: false,
    } as DetectionStat);
  stats.set(name, { ...prev, ...patch, cameraName: name });
  rebuildSnapshot();
}

export function removeDetectionStat(name: string) {
  if (stats.delete(name)) rebuildSnapshot();
}

export function subscribeDetectionStats(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getDetectionStatsSnapshot(): DetectionStat[] {
  return snapshot;
}
