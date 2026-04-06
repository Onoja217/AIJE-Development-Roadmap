import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, SwitchCamera, Maximize2, Minimize2 } from "lucide-react";

interface LiveCameraFeedProps {
  cameraName?: string;
  onClose?: () => void;
}

export function LiveCameraFeed({ cameraName = "Front Door", onClose }: LiveCameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    // Stop existing stream
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
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFacing = () => {
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

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative aspect-video rounded-lg bg-muted border border-border overflow-hidden"
    >
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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="scan-line absolute inset-0 pointer-events-none" />

          {/* Overlay UI */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-background/70 backdrop-blur-sm px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-[10px] font-mono text-destructive">LIVE</span>
            <span className="text-[10px] font-mono text-foreground ml-1">{cameraName}</span>
          </div>

          <div className="absolute top-2 right-2 flex gap-1.5">
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

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="text-[9px] font-mono text-foreground/70 bg-background/50 rounded px-1.5 py-0.5">
              {facingMode === "environment" ? "REAR CAM" : "FRONT CAM"}
            </span>
            <span className="text-[9px] font-mono text-foreground/70 bg-background/50 rounded px-1.5 py-0.5">
              720p • 30fps
            </span>
          </div>
        </>
      )}

      {onClose && (
        <button
          onClick={() => {
            stream?.getTracks().forEach((t) => t.stop());
            onClose();
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-primary hover:underline bg-background/70 backdrop-blur-sm rounded-md px-3 py-1"
        >
          ← Back to all cameras
        </button>
      )}
    </motion.div>
  );
}
