import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CameraMediaItem {
  id: string;
  camera_name: string;
  media_type: "snapshot" | "recording";
  file_path: string;
  file_size: number | null;
  duration: number | null;
  created_at: string;
  url: string;
}

export function useCameraMedia() {
  const { user } = useAuth();
  const [media, setMedia] = useState<CameraMediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedia = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("camera_media")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching camera media:", error);
      setLoading(false);
      return;
    }

    const items: CameraMediaItem[] = (data || []).map((row: any) => {
      const { data: urlData } = supabase.storage
        .from("camera-media")
        .getPublicUrl(row.file_path);
      return { ...row, url: urlData.publicUrl };
    });

    setMedia(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const uploadMedia = useCallback(
    async (blob: Blob, cameraName: string, type: "snapshot" | "recording", duration?: number) => {
      if (!user) {
        toast.error("Sign in to save media");
        return null;
      }

      const ext = type === "snapshot" ? "jpg" : "webm";
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const safeName = cameraName.toLowerCase().replace(/\s+/g, "-");
      const filePath = `${user.id}/${type}-${safeName}-${ts}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("camera-media")
        .upload(filePath, blob, {
          contentType: type === "snapshot" ? "image/jpeg" : "video/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to save to cloud");
        return null;
      }

      const { error: insertError } = await supabase.from("camera_media").insert({
        user_id: user.id,
        camera_name: cameraName,
        media_type: type,
        file_path: filePath,
        file_size: blob.size,
        duration: duration ?? null,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error("Failed to save metadata");
        return null;
      }

      toast.success(`${type === "snapshot" ? "Snapshot" : "Recording"} saved to cloud`);
      fetchMedia();
      return filePath;
    },
    [user, fetchMedia]
  );

  const deleteMedia = useCallback(
    async (item: CameraMediaItem) => {
      if (!user) return;
      await supabase.storage.from("camera-media").remove([item.file_path]);
      await supabase.from("camera_media").delete().eq("id", item.id);
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      toast.success("Media deleted");
    },
    [user]
  );

  return { media, loading, uploadMedia, deleteMedia, refetch: fetchMedia };
}
