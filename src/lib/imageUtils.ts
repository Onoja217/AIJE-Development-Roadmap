// lib/imageUtils.ts
import imageCompression from "browser-image-compression";
import type { ReportImage } from "../types/report";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
};

export async function fileToReportImage(file: File): Promise<ReportImage> {
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  const dataUrl = await imageCompression.getDataUrlFromFile(compressed);

  return {
    id: crypto.randomUUID(),
    dataUrl,
    fileName: file.name,
    sizeBytes: compressed.size,
  };
}

export async function filesToReportImages(files: FileList | File[]): Promise<ReportImage[]> {
  const fileArray = Array.from(files);
  return Promise.all(fileArray.map(fileToReportImage));
}
