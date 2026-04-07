import { useRef, useEffect, useCallback, useState } from "react";

interface MotionRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  intensity: number;
}

interface UseMotionDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  sensitivity?: number; // 0-100, higher = more sensitive
  gridSize?: number;    // cells per row/col for region detection
  fps?: number;
}

export function useMotionDetection({
  videoRef,
  enabled,
  sensitivity = 40,
  gridSize = 8,
  fps = 10,
}: UseMotionDetectionOptions) {
  const prevFrameRef = useRef<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const [regions, setRegions] = useState<MotionRegion[]>([]);
  const [motionLevel, setMotionLevel] = useState(0);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !enabled) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    const interval = 1000 / fps;
    if (now - lastTimeRef.current < interval) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastTimeRef.current = now;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    // Use reduced resolution for performance
    const scale = 0.25;
    const w = Math.floor(video.videoWidth * scale);
    const h = Math.floor(video.videoHeight * scale);
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);
    const prevFrame = prevFrameRef.current;

    if (prevFrame && prevFrame.width === w && prevFrame.height === h) {
      const threshold = Math.max(5, 60 - sensitivity * 0.55); // map sensitivity to pixel threshold
      const cellW = Math.floor(w / gridSize);
      const cellH = Math.floor(h / gridSize);
      const newRegions: MotionRegion[] = [];
      let totalDiff = 0;
      let totalPixels = 0;

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const startX = gx * cellW;
          const startY = gy * cellH;
          let cellDiff = 0;
          let cellPixels = 0;

          for (let y = startY; y < startY + cellH && y < h; y++) {
            for (let x = startX; x < startX + cellW && x < w; x++) {
              const i = (y * w + x) * 4;
              const dr = Math.abs(currentFrame.data[i] - prevFrame.data[i]);
              const dg = Math.abs(currentFrame.data[i + 1] - prevFrame.data[i + 1]);
              const db = Math.abs(currentFrame.data[i + 2] - prevFrame.data[i + 2]);
              const diff = (dr + dg + db) / 3;
              if (diff > threshold) {
                cellDiff += diff;
              }
              cellPixels++;
            }
          }

          totalDiff += cellDiff;
          totalPixels += cellPixels;

          const avgDiff = cellPixels > 0 ? cellDiff / cellPixels : 0;
          if (avgDiff > threshold * 0.3) {
            newRegions.push({
              x: gx / gridSize,
              y: gy / gridSize,
              w: 1 / gridSize,
              h: 1 / gridSize,
              intensity: Math.min(1, avgDiff / 80),
            });
          }
        }
      }

      setRegions(newRegions);
      setMotionLevel(totalPixels > 0 ? Math.min(100, (totalDiff / totalPixels) * 2) : 0);
    }

    prevFrameRef.current = currentFrame;
    rafRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, enabled, sensitivity, gridSize, fps]);

  useEffect(() => {
    if (enabled) {
      prevFrameRef.current = null;
      rafRef.current = requestAnimationFrame(processFrame);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setRegions([]);
      setMotionLevel(0);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, processFrame]);

  return { regions, motionLevel };
}
