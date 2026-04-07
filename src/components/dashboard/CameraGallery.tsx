import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Film, Trash2, Download, X, Clock, HardDrive } from "lucide-react";
import { useCameraMedia, CameraMediaItem } from "@/hooks/useCameraMedia";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDuration(s: number | null) {
  if (!s) return "";
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CameraGallery() {
  const { media, loading, deleteMedia } = useCameraMedia();
  const [preview, setPreview] = useState<CameraMediaItem | null>(null);
  const [filter, setFilter] = useState<"all" | "snapshot" | "recording">("all");

  const filtered = filter === "all" ? media : media.filter((m) => m.media_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(["all", "snapshot", "recording"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f === "snapshot" ? "Photos" : "Videos"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No saved media yet</p>
          <p className="text-xs mt-1">Snapshots and recordings will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map((item) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setPreview(item)}
              className="relative aspect-video rounded-lg border border-border bg-muted overflow-hidden group hover:border-primary/50 transition-colors"
            >
              {item.media_type === "snapshot" ? (
                <img src={item.url} alt={item.camera_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              {/* Overlay info */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <p className="text-[9px] font-mono text-white truncate">{item.camera_name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] text-white/70">{timeAgo(item.created_at)}</span>
                  {item.media_type === "recording" && item.duration && (
                    <span className="text-[8px] text-white/70">{formatDuration(item.duration)}</span>
                  )}
                </div>
              </div>

              {/* Type badge */}
              <div className="absolute top-1 right-1">
                {item.media_type === "snapshot" ? (
                  <ImageIcon className="h-3 w-3 text-white drop-shadow" />
                ) : (
                  <Film className="h-3 w-3 text-white drop-shadow" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Content */}
              {preview.media_type === "snapshot" ? (
                <img src={preview.url} alt={preview.camera_name} className="w-full aspect-video object-contain bg-black" />
              ) : (
                <video src={preview.url} controls className="w-full aspect-video bg-black" />
              )}

              {/* Info bar */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{preview.camera_name}</p>
                  <span className="text-xs text-muted-foreground">{timeAgo(preview.created_at)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatBytes(preview.file_size)}
                  </span>
                  {preview.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(preview.duration)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <a
                    href={preview.url}
                    download
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-secondary py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  <button
                    onClick={() => { deleteMedia(preview); setPreview(null); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
