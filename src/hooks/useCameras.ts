import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type StreamType = "hls" | "mjpeg" | "http";

export interface Camera {
  id: string;
  name: string;
  stream_url: string;
  stream_type: StreamType;
  enabled: boolean;
}

export function useCameras() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCameras = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cameras")
      .select("id, name, stream_url, stream_type, enabled")
      .order("created_at", { ascending: true });
    if (!error && data) setCameras(data as Camera[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const addCamera = useCallback(
    async (input: Omit<Camera, "id">) => {
      if (!user) return;
      const { error } = await supabase.from("cameras").insert({ ...input, user_id: user.id });
      if (error) {
        toast.error("Failed to add camera");
        return;
      }
      toast.success("Camera added");
      fetchCameras();
    },
    [user, fetchCameras]
  );

  const updateCamera = useCallback(
    async (id: string, patch: Partial<Omit<Camera, "id">>) => {
      const { error } = await supabase.from("cameras").update(patch).eq("id", id);
      if (error) {
        toast.error("Update failed");
        return;
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
      toast.success("Camera removed");
      setCameras((prev) => prev.filter((c) => c.id !== id));
    },
    []
  );

  return { cameras, loading, addCamera, updateCamera, deleteCamera, refetch: fetchCameras };
}
