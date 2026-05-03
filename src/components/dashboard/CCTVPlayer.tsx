import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { CameraOff } from "lucide-react";
import type { StreamType } from "@/hooks/useCameras";

interface CCTVPlayerProps {
  url: string;
  type: StreamType;
  videoRef?: React.RefObject<HTMLVideoElement>;
  className?: string;
}

export function CCTVPlayer({ url, type, videoRef: externalRef, className }: CCTVPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? internalRef;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const video = videoRef.current;
    if (!video || type === "mjpeg") return;

    let hls: Hls | null = null;

    if (type === "hls") {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else if (Hls.isSupported()) {
        hls = new Hls({ lowLatencyMode: true, enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError(`Stream error: ${data.type}`);
        });
      } else {
        setError("HLS not supported in this browser");
      }
    } else if (type === "http") {
      video.src = url;
    }

    return () => {
      hls?.destroy();
      if (video) video.removeAttribute("src");
    };
  }, [url, type, videoRef]);

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <CameraOff className="h-8 w-8 text-destructive" />
        <p className="text-xs text-muted-foreground">{error}</p>
        <p className="text-[10px] text-muted-foreground font-mono break-all">{url}</p>
      </div>
    );
  }

  if (type === "mjpeg") {
    return (
      <img
        src={url}
        alt="CCTV stream"
        className={className ?? "absolute inset-0 w-full h-full object-cover"}
        onError={() => setError("Failed to load MJPEG stream")}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      controls={false}
      className={className ?? "absolute inset-0 w-full h-full object-cover"}
    />
  );
}
