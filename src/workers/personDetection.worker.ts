/// <reference lib="webworker" />
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
function loadModel() {
  if (!modelPromise) modelPromise = cocoSsd.load({ base: "lite_mobilenet_v2" });
  return modelPromise;
}
// warm up immediately
loadModel().then(() => {
  (self as unknown as Worker).postMessage({ type: "ready" });
});

self.onmessage = async (e: MessageEvent) => {
  const data = e.data as { type: string; reqId?: number; bitmap?: ImageBitmap; minScore?: number };
  if (data.type === "detect" && data.bitmap && data.reqId != null) {
    const { reqId, bitmap, minScore = 0.55 } = data;
    try {
      const model = await loadModel();
      // coco-ssd accepts ImageBitmap as a PixelData source in workers
      const preds = await model.detect(bitmap as unknown as ImageData, 20);
      const filtered = preds
        .filter((p) => p.score >= minScore)
        .map((p) => ({ bbox: p.bbox, score: p.score, class: p.class }));
      (self as unknown as Worker).postMessage({ type: "detect:result", reqId, detections: filtered });
    } catch (err) {
      (self as unknown as Worker).postMessage({
        type: "detect:result",
        reqId,
        detections: [],
        error: String(err),
      });
    } finally {
      try { bitmap.close(); } catch { /* noop */ }
    }
  }
};
export {};
