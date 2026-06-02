import { useEffect, useRef, useState } from "react";
import { describeAllFromVideo, ensureFaceModels, findBestMatch } from "@/lib/faceApi";
import type { FaceEnrollment } from "@/hooks/useFaceRecognition";

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  enrollments: FaceEnrollment[];
  threshold: number;
  intervalMs?: number;
}

export interface LiveFaceMatch {
  enrollmentId: string;
  label: string;
  distance: number;
  at: number;
}

/**
 * Polls the video at `intervalMs` and matches detected faces against
 * the local watchlist. Everything runs on-device; descriptors are not transmitted.
 */
export function useFaceMatcher({ videoRef, enabled, enrollments, threshold, intervalMs = 1500 }: Options) {
  const [ready, setReady] = useState(false);
  const [lastMatch, setLastMatch] = useState<LiveFaceMatch | null>(null);
  const [lastUnknownAt, setLastUnknownAt] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    ensureFaceModels().then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const id = window.setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.videoWidth === 0) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const descriptors = await describeAllFromVideo(v);
        if (descriptors.length === 0) return;
        let bestForFrame: { id: string; label: string; distance: number } | null = null;
        for (const d of descriptors) {
          const m = findBestMatch(d, enrollments.map((e) => ({ id: e.id, label: e.label, descriptor: e.descriptor })), threshold);
          if (m && (!bestForFrame || m.distance < bestForFrame.distance)) bestForFrame = m;
        }
        if (bestForFrame) {
          setLastMatch({ enrollmentId: bestForFrame.id, label: bestForFrame.label, distance: bestForFrame.distance, at: Date.now() });
        } else {
          setLastUnknownAt(Date.now());
        }
      } catch {
        /* swallow */
      } finally {
        inFlightRef.current = false;
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, ready, enrollments, threshold, intervalMs, videoRef]);

  return { ready, lastMatch, lastUnknownAt };
}
