import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, SwitchCamera, Maximize2, Minimize2,
  Circle, Square, Download, Image as ImageIcon, Cloud, Loader2, Scan, ScanLine,
  WifiOff, Brain, UserSearch, ShieldAlert, Pencil
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

import { CCTVPlayer } from "@/components/dashboard/CCTVPlayer";
import type { StreamType } from "@/hooks/useCameras";

interface LiveCameraFeedProps {
  cameraName?: string;
  onClose?: () => void;
  streamUrl?: string;
  streamType?: StreamType;
  autoSnapshotIntervalOverrideSec?: number | null;
  simulatedMotionLevel?: number | null;
}

export function LiveCameraFeed({ cameraName = "Front Door", onClose, streamUrl, streamType, autoSnapshotIntervalOverrideSec, simulatedMotionLevel }: LiveCameraFeedProps) {
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

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashEffect, setFlashEffect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { regions, motionLevel } = useMotionDetection({
    videoRef,
    enabled: motionEnabled && !error,
    sensitivity: 45,
  });

  const { detections, loading: modelLoading } = usePersonDetection({
    videoRef,
    enabled: personDetectEnabled && !error,
    fps: 6,
    personOnly: false,
    minScore: 0.55,
  });
  const personCount = detections.filter((d) => d.class === "person").length;

  const { user } = useAuth();
  const { notify } = useAlertNotifications();
  const snapshotRef = useRef<() => void>(() => {});
  const lastAutoSnapRef = useRef(0);
  const { online, config: smartConfig } = useSmartMotionEngine({
    simulatedMotionLevel,
    user,
    motionLevel,
    cameraName,
    enabled: motionEnabled && !error,
    onAlert: (msg, sev) => {
      notify(msg, sev);
      toast(sev === "danger" ? "⚠️ Critical alert" : "Smart alert", { description: msg });
      // Auto-snapshot on alert, throttled by per-camera override or global setting
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
              onClick={() => setPersonDetectEnabled((v) => !v)}
              className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${
                personDetectEnabled
                  ? "bg-destructive/70 hover:bg-destructive/90"
                  : "bg-background/70 hover:bg-background/90"
              }`}
              title={personDetectEnabled ? "Disable person detection (AI)" : "Enable person detection (AI)"}
            >
              <UserSearch className={`h-4 w-4 ${personDetectEnabled ? "text-white" : "text-foreground"}`} />
            </button>
            <button
              onClick={() => setMotionEnabled((v) => !v)}
              className={`rounded-md backdrop-blur-sm p-1.5 transition-colors ${
                motionEnabled
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
                className={`rounded-full backdrop-blur-sm p-2 transition-colors ${
                  isRecording
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
