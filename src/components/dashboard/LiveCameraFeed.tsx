import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, SwitchCamera, Maximize2, Minimize2,
  Circle, Square, Download, Image as ImageIcon, Cloud, Loader2, Scan, ScanLine,
  WifiOff, Brain, UserSearch, ShieldAlert, Pencil, Moon
} from "lucide-react";
import { toast } from "sonner";
import { useCameraMedia } from "@/hooks/useCameraMedia";
import { useMotionDetection } from "@/hooks/useMotionDetection";
import { MotionOverlay } from "@/components/dashboard/MotionOverlay";
import { usePersonDetection } from "@/hooks/usePersonDetection";
import { PersonDetectionOverlay } from "@/components/dashboard/PersonDetectionOverlay";
import { RestrictedZoneEditor, loadZone, saveZone, type Zone } from "@/components/dashboard/RestrictedZoneEditor";
import { useAuth } from "@/hooks/useAuth";
import { useSmartMotionEngine } from "@/hooks/useSmartMotionEngine";
import { useAlertNotifications } from "@/hooks/useAlertNotifications";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { updateDetectionStat, removeDetectionStat } from "@/lib/detectionStats";
import { useFaceRecognition } from "@/hooks/useFaceRecognition";
import { useFaceMatcher } from "@/hooks/useFaceMatcher";

import { CCTVPlayer } from "@/components/dashboard/CCTVPlayer";
import type { StreamType } from "@/hooks/useCameras";

interface LiveCameraFeedProps {
  cameraName?: string;
  onClose?: () => void;
  streamUrl?: string;
  streamType?: StreamType;
  autoSnapshotIntervalOverrideSec?: number | null;
  zoneCooldownSec?: number | null;
  zoneAlertSeverity?: "info" | "warning" | "danger" | null;
  simulatedMotionLevel?: number | null;
  simulatedZoneIntrusion?: boolean;
}

export function LiveCameraFeed({ cameraName = "Front Door", onClose, streamUrl, streamType, autoSnapshotIntervalOverrideSec, zoneCooldownSec, zoneAlertSeverity, simulatedMotionLevel, simulatedZoneIntrusion }: LiveCameraFeedProps) {
  const isCCTV = !!streamUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { uploadMedia } = useCameraMedia();
  const [uploading, setUploading] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [personDetectEnabled, setPersonDetectEnabled] = useState(false);
  const [zoneEnabled, setZoneEnabled] = useState(false);
  const [zoneEditing, setZoneEditing] = useState(false);
  const [zone, setZone] = useState<Zone>(() => loadZone(cameraName));

  // Auto-enable zone arming whenever a simulator is driving this feed
  useEffect(() => {
    if (simulatedZoneIntrusion !== undefined) setZoneEnabled(true);
  }, [simulatedZoneIntrusion]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashEffect, setFlashEffect] = useState(false);
  const [nightVision, setNightVision] = useState(false);
  const [threatScore, setThreatScore] = useState<number>(0);
  const [zoneIntrusionActive, setZoneIntrusionActive] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-camera global pause flag set from Detection Manager
  const [globallyPaused, setGloballyPaused] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(`aije.detection.paused.${cameraName}`) === "1",
  );
  useEffect(() => {
    const key = `aije.detection.paused.${cameraName}`;
    const sync = () => setGloballyPaused(localStorage.getItem(key) === "1");
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === key) sync(); };
    window.addEventListener("storage", onStorage);
    const id = setInterval(sync, 1500); // pick up same-tab toggles
    return () => { window.removeEventListener("storage", onStorage); clearInterval(id); };
  }, [cameraName]);

  // Per-camera confidence threshold set from Detection Manager
  const [minConfidence, setMinConfidence] = useState(() => {
    if (typeof window === "undefined") return 0.8;
    const raw = localStorage.getItem(`aije.detection.confidence.${cameraName}`);
    const parsed = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 0.8;
  });
  useEffect(() => {
    const key = `aije.detection.confidence.${cameraName}`;
    const sync = () => {
      const raw = localStorage.getItem(key);
      const parsed = raw ? parseFloat(raw) : NaN;
      setMinConfidence(Number.isFinite(parsed) ? parsed : 0.8);
    };
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === key) sync(); };
    window.addEventListener("storage", onStorage);
    const id = setInterval(sync, 1500);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(id); };
  }, [cameraName]);

  const { regions, motionLevel } = useMotionDetection({
    videoRef,
    enabled: motionEnabled && !error,
    sensitivity: 45,
  });

  // Motion-gate: only run expensive AI inference when there is active motion.
  // If motion detection is disabled by the user, fall back to always-on AI.
  const hasActiveMotion = motionLevel > 1.5;
  const shouldProcessAI = !motionEnabled || hasActiveMotion;

  const { detections, loading: modelLoading } = usePersonDetection({
    videoRef,
    enabled: personDetectEnabled && !error && !globallyPaused,
    fps: 6,
    personOnly: false,
    minScore: minConfidence,
    shouldProcess: shouldProcessAI,
    confirmFrames: 3,
    smoothing: 0.4,
  });
  const confirmedPersons = detections.filter(
    (d) => d.class === "person" && (d.seenCount ?? 0) >= 3,
  );
  const personCount = confirmedPersons.length;
  const avgConfidence =
    confirmedPersons.length > 0
      ? confirmedPersons.reduce((sum, d) => sum + (d.avgScore ?? d.score), 0) /
        confirmedPersons.length
      : 0;

  // Telemetry → Detection Manager (rolling fps from detection batches)
  const detectTimestampsRef = useRef<number[]>([]);
  useEffect(() => {
    if (!personDetectEnabled) return;
    const now = performance.now();
    const arr = detectTimestampsRef.current;
    arr.push(now);
    while (arr.length > 30 || (arr.length && now - arr[0] > 5000)) arr.shift();
    const fps =
      arr.length > 1 ? (arr.length - 1) / ((arr[arr.length - 1] - arr[0]) / 1000) : 0;
    updateDetectionStat(cameraName, {
      enabled: true,
      personCount,
      fps: Math.round(fps * 10) / 10,
      lastDetectionAt: Date.now(),
      zoneArmed: zoneEnabled,
      avgConfidence,
      minConfidence,
      modelLoading,
    });
  }, [detections, personCount, avgConfidence, minConfidence, personDetectEnabled, cameraName, zoneEnabled, modelLoading]);

  useEffect(() => {
    updateDetectionStat(cameraName, {
      enabled: personDetectEnabled,
      zoneArmed: zoneEnabled,
      minConfidence,
      modelLoading,
    });
  }, [personDetectEnabled, zoneEnabled, minConfidence, modelLoading, cameraName]);

  useEffect(() => {
    return () => {
      removeDetectionStat(cameraName);
    };
  }, [cameraName]);

  const { user } = useAuth();
  const { notify } = useAlertNotifications();
  const { queueAlert } = useOfflineQueue(user);
  const snapshotRef = useRef<() => void>(() => { });
  const lastAutoSnapRef = useRef(0);
  const lastZoneAlertRef = useRef(0);
  const alertedTrackIdsRef = useRef<Record<number, number>>({});

  // ─── Face recognition (on-device; only active after consent + master toggle) ───
  const fr = useFaceRecognition();
  const faceActive = fr.isActive && !globallyPaused && !error;
  const { lastMatch } = useFaceMatcher({
    videoRef,
    enabled: faceActive && !isCCTV, // descriptor extraction needs frame access
    enrollments: fr.enrollments,
    threshold: fr.settings?.match_threshold ?? 0.55,
    intervalMs: 1500,
  });
  const { online, config: smartConfig } = useSmartMotionEngine({
    simulatedMotionLevel,
    user,
    motionLevel,
    cameraName,
    enabled: motionEnabled && !error,
    onAlert: (msg, sev) => {
      notify(msg, sev);
      toast(sev === "danger" ? "⚠️ Critical alert" : "Smart alert", { description: msg });
      const now = Date.now();
      const effectiveSec =
        autoSnapshotIntervalOverrideSec != null
          ? autoSnapshotIntervalOverrideSec
          : (smartConfig.auto_snapshot_interval_sec ?? 15);
      const intervalMs = effectiveSec * 1000;
      if (intervalMs > 0 && now - lastAutoSnapRef.current > intervalMs) {
        lastAutoSnapRef.current = now;
        snapshotRef.current();
      }
    },
  });

  // Restricted-zone intrusion: alert when a person bbox center enters the zone
  useEffect(() => {
    if (!zoneEnabled) {
      setZoneIntrusionActive(false);
      setThreatScore(0);
      return;
    }
    let inside = false;
    let intruders: { trackId?: number }[] = [];
    let maxConfidence = 0.70;
    let maxSeenCount = 0;

    if (simulatedZoneIntrusion) {
      inside = true;
      maxConfidence = 0.85;
      maxSeenCount = 10;
    } else {
      if (!personDetectEnabled || personCount === 0) {
        setZoneIntrusionActive(false);
        setThreatScore(0);
        return;
      }
      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        setZoneIntrusionActive(false);
        setThreatScore(0);
        return;
      }
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const inZone: typeof detections = detections.filter((d) => {
        if (d.class !== "person") return false;
        // Gate: Must be seen for at least 3 frames to avoid transient false alarms
        if (d.seenCount && d.seenCount < 3) return false;
        const [x, y, w, h] = d.bbox;
        const cx = (x + w / 2) / vw;
        const cy = (y + h / 2) / vh;
        return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h;
      });

      inside = inZone.length > 0;
      intruders = inZone;
      if (inside) {
        maxConfidence = inZone.reduce((max, d) => Math.max(max, d.score), 0);
        maxSeenCount = inZone.reduce((max, d) => Math.max(max, d.seenCount ?? 0), 0);
      }
    }

    if (!inside) {
      setZoneIntrusionActive(false);
      setThreatScore(0);
      return;
    }

    const now = Date.now();
    const hasFaceMatch = faceActive && lastMatch && (now - lastMatch.at < 3000);
    const faceMatchInfo = hasFaceMatch ? { isTrusted: true } : null;

    const computedScore = calculateThreatScore({
      maxConfidence,
      maxSeenCount,
      zoneSeverity: zoneAlertSeverity ?? "danger",
      faceMatch: faceMatchInfo,
    });

    setZoneIntrusionActive(true);
    setThreatScore(computedScore);

    const cooldownMs = (zoneCooldownSec ?? 30) * 1000;
    
    // Filter intruders to only evaluate targets not currently in cooldown
    const targetsToAlert = simulatedZoneIntrusion
      ? [{ trackId: -1 }]
      : intruders.filter((p) => {
          if (p.trackId === undefined) return true;
          const lastAlertTime = alertedTrackIdsRef.current[p.trackId];
          return !lastAlertTime || (now - lastAlertTime >= cooldownMs);
        });

    if (targetsToAlert.length === 0) return;

    // ── Face recognition gate: if a trusted face was just matched, suppress ──
    const recentTrusted =
      faceActive &&
      fr.settings?.suppress_alerts_for_trusted &&
      lastMatch &&
      now - lastMatch.at < 3000;

    if (recentTrusted && lastMatch) {
      fr.logAudit({
        camera_name: cameraName,
        match_enrollment_id: lastMatch.enrollmentId,
        match_label: lastMatch.label,
        confidence: lastMatch.distance,
        outcome: "suppressed_alert",
      });
      toast(`Trusted: ${lastMatch.label}`, { description: `Alert suppressed in ${cameraName}` });
      return;
    }

    // Dynamic severity mapping based on threat score
    let severity: "info" | "warning" | "danger" = "warning";
    if (computedScore > 75) {
      severity = "danger";
    } else if (computedScore < 40) {
      severity = "info";
    }

    const idsString = targetsToAlert
      .map((t) => (t.trackId === -1 ? "simulation" : `#${t.trackId}`))
      .join(", ");
    const msg = `Intrusion: person ${idsString} detected in restricted zone (${cameraName}) [Threat Score: ${computedScore}%]`;
    
    notify(msg, severity === "danger" ? "danger" : "warning");
    const toastTitle =
      severity === "danger" ? "⚠️ Intrusion detected"
        : severity === "warning" ? "Zone activity"
          : "Zone notice";
    toast(toastTitle, { description: msg });
    
    queueAlert({
      sensor_type: "person_zone",
      severity,
      message: msg,
      value: computedScore,
    });

    // Mark targets as alerted in cooldown tracker
    targetsToAlert.forEach((t) => {
      if (t.trackId !== undefined) {
        alertedTrackIdsRef.current[t.trackId] = now;
      }
    });

    // Audit log: matched-but-not-suppressed, or unknown
    if (faceActive) {
      if (lastMatch && now - lastMatch.at < 3000) {
        fr.logAudit({
          camera_name: cameraName,
          match_enrollment_id: lastMatch.enrollmentId,
          match_label: lastMatch.label,
          confidence: lastMatch.distance,
          outcome: "matched_trusted",
        });
      } else if (fr.settings?.log_unknowns) {
        fr.logAudit({ camera_name: cameraName, outcome: "unknown" });
      }
    }

    const effectiveSec =
      autoSnapshotIntervalOverrideSec != null
        ? autoSnapshotIntervalOverrideSec
        : (smartConfig.auto_snapshot_interval_sec ?? 15);
    const intervalMs = effectiveSec * 1000;
    if (intervalMs > 0 && now - lastAutoSnapRef.current > intervalMs) {
      lastAutoSnapRef.current = now;
      snapshotRef.current();
    }
  }, [detections, personCount, zoneEnabled, personDetectEnabled, zone, cameraName, notify, queueAlert, autoSnapshotIntervalOverrideSec, smartConfig.auto_snapshot_interval_sec, zoneCooldownSec, zoneAlertSeverity, simulatedZoneIntrusion, faceActive, fr, lastMatch]);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    stream?.getTracks().forEach((t) => t.stop());
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isCCTV) return;
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, isCCTV]); // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot
  const takeSnapshot = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Flash effect
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    canvas.toBlob(async (blob) => {
      if (blob) {
        setUploading(true);
        await uploadMedia(blob, cameraName, "snapshot");
        setUploading(false);
      }
    }, "image/jpeg", 0.92);
  }, [cameraName, uploadMedia]);

  // Keep ref in sync so smart engine can trigger auto-snapshots
  useEffect(() => {
    snapshotRef.current = takeSnapshot;
  }, [takeSnapshot]);

  // Recording
  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setUploading(true);
        await uploadMedia(blob, cameraName, "recording", recordingTime);
        setUploading(false);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Recording not supported on this device");
    }
  }, [stream, cameraName, uploadMedia, recordingTime]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleFacing = () => {
    if (isRecording) stopRecording();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative aspect-video rounded-lg bg-muted border border-border overflow-hidden"
    >
      {/* Hidden canvas for snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <CameraOff className="h-8 w-8 text-destructive" />
          <p className="text-sm text-center text-muted-foreground">{error}</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={
              nightVision
                ? {
                  filter:
                    "grayscale(1) brightness(1.6) contrast(1.4) sepia(1) hue-rotate(60deg) saturate(6)",
                }
                : undefined
            }
          >
            {isCCTV && streamUrl ? (
              <CCTVPlayer url={streamUrl} type={streamType ?? "hls"} videoRef={videoRef} />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
          {nightVision && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(0,255,120,0.05), rgba(0,0,0,0.35) 80%)",
              }}
            />
          )}
          <div className="scan-line absolute inset-0 pointer-events-none" />

          {/* Motion detection overlay */}
          <MotionOverlay regions={regions} motionLevel={motionLevel} enabled={motionEnabled} />

          {/* Person/object detection overlay */}
          {personDetectEnabled && videoRef.current && (
            <PersonDetectionOverlay
              detections={detections}
              videoWidth={videoRef.current.videoWidth}
              videoHeight={videoRef.current.videoHeight}
            />
          )}

          {/* Restricted zone */}
          {zoneEnabled && (
            <RestrictedZoneEditor
              cameraName={cameraName}
              editing={zoneEditing}
              zone={zone}
              onChange={setZone}
            />
          )}

          {/* Offline / smart-engine status pill */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {!online && (
              <span className="flex items-center gap-1 rounded-md bg-warning/80 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono text-warning-foreground">
                <WifiOff className="h-3 w-3" /> OFFLINE • QUEUEING
              </span>
            )}
            {motionEnabled && (
              <span className="flex items-center gap-1 rounded-md bg-primary/70 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono text-primary-foreground">
                <Brain className="h-3 w-3" /> SMART RULES
              </span>
            )}
            {personDetectEnabled && (
              <span className="flex items-center gap-1 rounded-md bg-destructive/80 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono text-destructive-foreground">
                <UserSearch className="h-3 w-3" />
                {modelLoading ? "LOADING AI…" : `AI • ${personCount} PERSON${personCount === 1 ? "" : "S"}`}
              </span>
            )}
            {zoneEnabled && (
              <span className="flex items-center gap-1 rounded-md bg-warning/80 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono text-warning-foreground">
                <ShieldAlert className="h-3 w-3" /> ZONE ARMED
              </span>
            )}
            {zoneIntrusionActive && (
              <span className="flex items-center gap-1 rounded-md bg-destructive animate-pulse px-2 py-0.5 text-[9px] font-mono text-destructive-foreground">
                <ShieldAlert className="h-3 w-3" /> THREAT: {threatScore}%
              </span>
            )}
            {nightVision && (
              <span className="flex items-center gap-1 rounded-md bg-success/80 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono text-success-foreground">
                <Moon className="h-3 w-3" /> NIGHT VISION
              </span>
            )}
          </div>


          {/* Flash overlay */}
          <AnimatePresence>
            {flashEffect && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-white z-20 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Top-left: LIVE + camera name */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-background/70 backdrop-blur-sm px-2 py-1">
            {isRecording ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[10px] font-mono text-destructive">REC</span>
                <span className="text-[10px] font-mono text-destructive ml-1">{formatTime(recordingTime)}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[10px] font-mono text-destructive">LIVE</span>
                <span className="text-[10px] font-mono text-foreground ml-1">{cameraName}</span>
              </>
            )}
          </div>

          {/* Top-right: motion toggle, switch camera, fullscreen */}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              onClick={() => setNightVision((v) => !v)}
              className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${nightVision ? "bg-success/80 hover:bg-success" : "bg-background/70 hover:bg-background/90"
                }`}
              title={nightVision ? "Disable night vision" : "Enable night vision"}
            >
              <Moon className={`h-4 w-4 ${nightVision ? "text-success-foreground" : "text-foreground"}`} />
            </button>
            <button
              onClick={() => {
                setZoneEnabled((v) => {
                  const next = !v;
                  if (next && !personDetectEnabled) setPersonDetectEnabled(true);
                  if (!next) setZoneEditing(false);
                  return next;
                });
              }}
              className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${zoneEnabled ? "bg-warning/80 hover:bg-warning" : "bg-background/70 hover:bg-background/90"
                }`}
              title={zoneEnabled ? "Disable restricted zone" : "Enable restricted zone"}
            >
              <ShieldAlert className={`h-4 w-4 ${zoneEnabled ? "text-warning-foreground" : "text-foreground"}`} />
            </button>
            {zoneEnabled && (
              <button
                onClick={() => {
                  setZoneEditing((v) => {
                    if (v) saveZone(cameraName, zone);
                    return !v;
                  });
                }}
                className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${zoneEditing ? "bg-primary/80 hover:bg-primary" : "bg-background/70 hover:bg-background/90"
                  }`}
                title={zoneEditing ? "Done editing zone" : "Edit zone"}
              >
                <Pencil className={`h-4 w-4 ${zoneEditing ? "text-primary-foreground" : "text-foreground"}`} />
              </button>
            )}
            <button
              onClick={() => setPersonDetectEnabled((v) => !v)}
              className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${personDetectEnabled
                  ? "bg-destructive/70 hover:bg-destructive/90"
                  : "bg-background/70 hover:bg-background/90"
                }`}
              title={personDetectEnabled ? "Disable person detection (AI)" : "Enable person detection (AI)"}
            >
              <UserSearch className={`h-4 w-4 ${personDetectEnabled ? "text-white" : "text-foreground"}`} />
            </button>
            <button
              onClick={() => setMotionEnabled((v) => !v)}
              className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${motionEnabled
                  ? "bg-destructive/70 hover:bg-destructive/90"
                  : "bg-background/70 hover:bg-background/90"
                }`}
              title={motionEnabled ? "Disable motion detection" : "Enable motion detection"}
            >
              <Scan className={`h-4 w-4 ${motionEnabled ? "text-white" : "text-foreground"}`} />
            </button>
            <button
              onClick={toggleFacing}
              className="rounded-md bg-background/70 backdrop-blur-sm p-1.5 hover:bg-background/90 transition-colors"
              title="Switch camera"
            >
              <SwitchCamera className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-md bg-background/70 backdrop-blur-sm p-1.5 hover:bg-background/90 transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-foreground" />
              ) : (
                <Maximize2 className="h-4 w-4 text-foreground" />
              )}
            </button>
          </div>

          {/* Bottom controls: snapshot + record */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="text-[9px] font-mono text-foreground/70 bg-background/50 rounded px-1.5 py-0.5">
              {facingMode === "environment" ? "REAR CAM" : "FRONT CAM"}
            </span>

            <div className="flex items-center gap-2">
              {/* Snapshot button */}
              <button
                onClick={takeSnapshot}
                className="rounded-full bg-background/70 backdrop-blur-sm p-2 hover:bg-background/90 transition-colors"
                title="Take snapshot"
              >
                <ImageIcon className="h-4 w-4 text-foreground" />
              </button>

              {/* Record button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`rounded-full backdrop-blur-sm p-2 transition-colors ${isRecording
                    ? "bg-destructive/80 hover:bg-destructive"
                    : "bg-background/70 hover:bg-background/90"
                  }`}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? (
                  <Square className="h-4 w-4 text-destructive-foreground" />
                ) : (
                  <Circle className="h-4 w-4 text-destructive" />
                )}
              </button>
            </div>

            <span className="text-[9px] font-mono text-foreground/70 bg-background/50 rounded px-1.5 py-0.5">
              720p • 30fps
            </span>
          </div>
        </>
      )}

      {onClose && (
        <button
          onClick={() => {
            if (isRecording) stopRecording();
            stream?.getTracks().forEach((t) => t.stop());
            onClose();
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-primary hover:underline bg-background/70 backdrop-blur-sm rounded-md px-3 py-1"
        >
          ← Back to all cameras
        </button>
      )}
    </motion.div>
  );
}

interface ThreatScoreInput {
  maxConfidence: number;      // highest confidence of detections in zone (0.70 to 1.00)
  maxSeenCount: number;       // highest frames target has been present
  zoneSeverity: "info" | "warning" | "danger";
  faceMatch?: { isTrusted: boolean } | null;
}

function calculateThreatScore(input: ThreatScoreInput): number {
  let score = 0;

  // 1. Detection confidence contribution (up to 40 pts)
  score += input.maxConfidence * 40;

  // 2. Presence duration contribution (up to 30 pts)
  // Cap at 30 frames (~5 seconds of lingering)
  score += Math.min(30, input.maxSeenCount) * 1.0;

  // 3. Zone configuration priority (up to 20 pts)
  if (input.zoneSeverity === "danger") {
    score += 20;
  } else if (input.zoneSeverity === "warning") {
    score += 10;
  }

  // 4. Face recognition override (trusted faces deduct 50 pts)
  if (input.faceMatch) {
    if (input.faceMatch.isTrusted) {
      score = Math.max(5, score - 50); // Suppress but keep low baseline
    } else {
      score = Math.min(100, score + 10); // Unrecognized faces add threat
    }
  }

  return Math.min(100, Math.round(score));
}
