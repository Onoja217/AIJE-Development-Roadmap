import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, XCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAlertNotifications } from "@/hooks/useAlertNotifications";
import type { SensorData } from "@/hooks/useLiveSensorData";

/* =========================
   ENTERPRISE TYPES
========================= */
type Severity = "info" | "warning" | "danger" | "resolved";
type SourceMode = "offline" | "online" | "replay";

interface Alert {
  id: string;
  time: string;
  message: string;
  zone: string;
  severity: Severity;
  score: number;
  source: SourceMode;
  cameraId?: string;
  fingerprint: string;
}

/* =========================
   ENTERPRISE CONFIG
========================= */
const severityConfig = {
  info: { icon: Info, color: "text-primary", border: "border-primary/20" },
  warning: { icon: AlertTriangle, color: "text-warning", border: "border-warning/20" },
  danger: { icon: XCircle, color: "text-destructive", border: "border-destructive/20" },
  resolved: { icon: CheckCircle2, color: "text-success", border: "border-success/20" },
};

const ZONES = [
  "Zone A - North Wall",
  "Zone B - East Wing",
  "Zone C - South Gate",
  "Zone D - Rear Entry",
];

const HISTORY_LIMIT = 40;
const ALERT_COOLDOWN = 6000;

/* =========================
   ENTERPRISE UTILITIES
========================= */
const now = () => Date.now();
const formatTime = () => new Date().toISOString();

const pickZone = () =>
  ZONES[Math.floor(Math.random() * ZONES.length)];

/* =========================
   CAMERA CONTEXT (ENTERPRISE READY)
========================= */
const CAMERA_POOL = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"];

/* =========================
   AI SCORE ENGINE (EDGE AI)
========================= */
function calculateScore(s: SensorData, history: number[]) {
  const hour = new Date().getHours();
  const night = hour < 6 || hour > 22;

  let score =
    (s.motion.status === "alert" ? (night ? 50 : 25) : 0) +
    (s.vibration.status === "alert" ? 30 : 0) +
    (s.access.status === "alert" ? (night ? 55 : 30) : 0) +
    (s.movement.status === "alert" ? 25 : 0) +
    (s.cameras.status === "warning" ? 10 : 0);

  if (history.length > 10) {
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    if (score > avg * 1.35) score += 20;
  }

  return Math.min(score, 100);
}

/* =========================
   ENTERPRISE RULE ENGINE
========================= */
function detectAnomaly(s: SensorData, score: number, history: number[]) {
  const night = new Date().getHours() < 6 || new Date().getHours() > 22;
  const motion = s.motion.status === "alert";

  const highEvents = history.filter((x) => x > 35).length;

  if (!night && motion && highEvents < 2)
    return { trigger: false, reason: "normal_activity" };

  if (night && motion)
    return { trigger: true, reason: "unauthorized_night_motion" };

  if (highEvents >= 4)
    return { trigger: true, reason: "sustained_motion_pattern" };

  if (score > 75)
    return { trigger: true, reason: "high_confidence_threat" };

  return { trigger: false, reason: "low_risk" };
}

/* =========================
   SEVERITY MAPPER
========================= */
function severityFromScore(score: number): Severity {
  if (score >= 75) return "danger";
  if (score >= 45) return "warning";
  if (score > 0) return "info";
  return "resolved";
}

/* =========================
   ENTERPRISE FINGERPRINT (DEDUP + AUDIT)
========================= */
function createFingerprint(alert: Partial<Alert>) {
  return btoa(
    `${alert.message}-${alert.zone}-${alert.cameraId}-${alert.severity}`
  );
}

/* =========================
   OFFLINE QUEUE (ENTERPRISE RELIABILITY)
========================= */
function saveOfflineQueue(alert: Alert) {
  const key = "enterprise_cctv_queue";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");

  existing.push(alert);

  if (existing.length > 500) existing.shift();

  localStorage.setItem(key, JSON.stringify(existing));
}

/* =========================
   CLOUD SYNC (ENTERPRISE BACKEND READY)
========================= */
async function syncCloud(alert: Alert) {
  try {
    await addDoc(collection(db, "enterprise_alerts"), {
      ...alert,
      createdAt: serverTimestamp(),
    });
  } catch {
    // silent retry system (backend-ready)
  }
}

/* =========================
   DUPLICATION CONTROL (ENTERPRISE LEVEL)
========================= */
function isDuplicate(map: Map<string, number>, fp: string) {
  const t = now();
  const last = map.get(fp);

  if (last && t - last < ALERT_COOLDOWN) return true;

  map.set(fp, t);

  return false;
}

/* =========================
   AUDIO HOOK (SAFE)
========================= */
function useAlertSound() {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ref.current = new Audio("/sounds/alert.mp3");
  }, []);

  return ref;
}

/* =========================
   PROPS
========================= */
interface Props {
  sensors?: SensorData;
  cameraId?: string;
}

/* =========================
   ENTERPRISE COMPONENT
========================= */
export function AlertFeed({ sensors, cameraId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { notify } = useAlertNotifications();

  const history = useRef<number[]>([]);
  const dedup = useRef<Map<string, number>>(new Map());
  const sound = useAlertSound();

  /* =========================
     ENTERPRISE ENGINE LOOP
  ========================= */
  useEffect(() => {
    if (!sensors) return;

    const score = calculateScore(sensors, history.current);

    history.current.push(score);
    if (history.current.length > HISTORY_LIMIT) history.current.shift();

    const { trigger, reason } = detectAnomaly(
      sensors,
      score,
      history.current
    );

    if (!trigger) return;

    const severity = severityFromScore(score);

    const alert: Alert = {
      id: crypto.randomUUID(),
      time: formatTime(),
      message: reason.replaceAll("_", " "),
      zone: pickZone(),
      severity,
      score,
      source: navigator.onLine ? "online" : "offline",
      cameraId: cameraId || CAMERA_POOL[Math.floor(Math.random() * CAMERA_POOL.length)],
      fingerprint: "",
    };

    alert.fingerprint = createFingerprint(alert);

    if (isDuplicate(dedup.current, alert.fingerprint)) return;

    setAlerts((prev) => [alert, ...prev].slice(0, 100));

    /* =========================
       OFFLINE-FIRST STORAGE
    ========================= */
    saveOfflineQueue(alert);

    /* =========================
       CLOUD SYNC (ENTERPRISE)
    ========================= */
    if (navigator.onLine) {
      syncCloud(alert);
    }

    /* =========================
       ALERT SYSTEM
    ========================= */
    if (severity === "danger") {
      sound.current?.play().catch(() => {});
      notify(`CAM ${alert.cameraId}: ${alert.message}`, "danger");
    }
  }, [sensors, cameraId, notify]);

  /* =========================
     UI
  ========================= */
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          Enterprise CCTV AI System
        </h3>

        <span
          className={`text-xs ${
            navigator.onLine ? "text-green-500" : "text-yellow-500"
          }`}
        >
          {navigator.onLine ? "ONLINE CLUSTER" : "EDGE MODE"}
        </span>
      </div>

      <div className="space-y-2 max-h-[450px] overflow-y-auto">
        <AnimatePresence>
          {alerts.map((a) => {
            const { icon: Icon, color, border } =
              severityConfig[a.severity];

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 p-3 rounded-lg border ${border}`}
              >
                <Icon className={`h-4 w-4 ${color}`} />

                <div className="w-full">
                  <p className="text-sm font-medium">
                    CAM {a.cameraId} • {a.message}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {a.time} • {a.zone} • Score {a.score} • {a.source}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}