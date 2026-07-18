import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type StreamType = "hls" | "mjpeg" | "http";
export type ZoneAlertSeverity = "info" | "warning" | "danger";

export interface CameraMeta {
  location?: string;
  resolution?: string;
  camera_type?: string;
  recording_enabled?: boolean;
  ai_enabled?: boolean;
  ai_module?: string;
}

export interface Camera {
  id: string;
  name: string;
  stream_url: string;
  stream_type: StreamType;
  enabled: boolean;
  auto_snapshot_interval_sec: number | null;
  zone_cooldown_sec: number | null;
  zone_alert_severity: ZoneAlertSeverity | null;
  
  // Extended fields stored in localStorage
  location?: string;
  resolution?: string;
  camera_type?: string;
  recording_enabled?: boolean;
  ai_enabled?: boolean;
  ai_module?: string;
}

const getMetaKey = (id: string) => `camera_meta_${id}`;

const loadCameraMeta = (id: string): CameraMeta => {
  try {
    const raw = localStorage.getItem(getMetaKey(id));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load camera meta", e);
    return {};
  }
};

const saveCameraMeta = (id: string, meta: CameraMeta) => {
  try {
    const existing = loadCameraMeta(id);
    localStorage.setItem(getMetaKey(id), JSON.stringify({ ...existing, ...meta }));
  } catch (e) {
    console.error("Failed to save camera meta", e);
  }
};

const removeCameraMeta = (id: string) => {
  localStorage.removeItem(getMetaKey(id));
};

export function useCameras() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCameras = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cameras")
      .select("id, name, stream_url, stream_type, enabled, auto_snapshot_interval_sec, zone_cooldown_sec, zone_alert_severity")
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      const enriched = data.map((cam: any) => {
        const meta = loadCameraMeta(cam.id);
        return {
          ...cam,
          location: meta.location || "Default Location",
          resolution: meta.resolution || "1080p",
          camera_type: meta.camera_type || "Bullet",
          recording_enabled: meta.recording_enabled !== undefined ? meta.recording_enabled : true,
          ai_enabled: meta.ai_enabled !== undefined ? meta.ai_enabled : cam.enabled,
        };
      });
      setCameras(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const addCamera = useCallback(
    async (input: Omit<Camera, "id">) => {
      if (!user) return;
      
      const { location, resolution, camera_type, recording_enabled, ai_enabled, ...supabaseInput } = input as any;

      const { data, error } = await supabase
        .from("cameras")
        .insert({ ...supabaseInput, user_id: user.id })
        .select("id")
        .single();
        
      if (error) {
        console.error("Failed to add camera:", error);
        toast.error(`Failed to add camera: ${error.message}`);
        return;
      }
      
      if (data?.id) {
        saveCameraMeta(data.id, {
          location: location || "Default Location",
          resolution: resolution || "1080p",
          camera_type: camera_type || "Bullet",
          recording_enabled: recording_enabled !== undefined ? recording_enabled : true,
          ai_enabled: ai_enabled !== undefined ? ai_enabled : true,
        });
      }
      
      toast.success("Camera added");
      fetchCameras();
    },
    [user, fetchCameras]
  );

  const updateCamera = useCallback(
    async (id: string, patch: Partial<Omit<Camera, "id">>) => {
      const { location, resolution, camera_type, recording_enabled, ai_enabled, ...supabasePatch } = patch as any;

      if (Object.keys(supabasePatch).length > 0) {
        const { error } = await supabase.from("cameras").update(supabasePatch).eq("id", id);
        if (error) {
          toast.error("Update failed");
          return;
        }
      }

      const metaPatch: CameraMeta = {};
      if (location !== undefined) metaPatch.location = location;
      if (resolution !== undefined) metaPatch.resolution = resolution;
      if (camera_type !== undefined) metaPatch.camera_type = camera_type;
      if (recording_enabled !== undefined) metaPatch.recording_enabled = recording_enabled;
      if (ai_enabled !== undefined) metaPatch.ai_enabled = ai_enabled;

      if (Object.keys(metaPatch).length > 0) {
        saveCameraMeta(id, metaPatch);
      }

      fetchCameras();
    },
    [fetchCameras]
  );

  const deleteCamera = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("cameras").delete().eq("id", id);
      if (error) {
        toast.error("Delete failed");
        return;
      }
      removeCameraMeta(id);
      toast.success("Camera removed");
      setCameras((prev) => prev.filter((c) => c.id !== id));
    },
    []
  );

  return { cameras, loading, addCamera, updateCamera, deleteCamera, refetch: fetchCameras };
}
