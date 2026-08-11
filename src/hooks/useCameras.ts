import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAccess } from "@/features/access/AccessProvider";

const cameraDb = supabase as unknown as SupabaseClient;

export type StreamType = "hls" | "mjpeg" | "http";
export type ZoneAlertSeverity = "info" | "warning" | "danger";

export interface Camera {
  id: string;
  name: string;
  stream_url: string;
  stream_type: StreamType;
  enabled: boolean;
  auto_snapshot_interval_sec: number | null;
  zone_cooldown_sec: number | null;
  zone_alert_severity: ZoneAlertSeverity | null;
}

export function useCameras() {
  const { user } = useAuth();
  const { activeOrganization } = useAccess();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCameras = useCallback(async () => {
    if (!user || !activeOrganization) return;
    setLoading(true);
    const { data, error } = await cameraDb
      .from("cameras")
      .select(
        "id, name, stream_url, stream_type, enabled, auto_snapshot_interval_sec, zone_cooldown_sec, zone_alert_severity",
      )
      .eq("organization_id", activeOrganization.id)
      .order("created_at", { ascending: true });
    if (!error && data) setCameras(data as Camera[]);
    setLoading(false);
  }, [activeOrganization, user]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const addCamera = useCallback(
    async (input: Omit<Camera, "id">) => {
      if (!user || !activeOrganization) return;
      const { error } = await cameraDb.from("cameras").insert({
        ...input,
        user_id: user.id,
        organization_id: activeOrganization.id,
      });
      if (error) {
        console.error("Failed to add camera:", error);
        toast.error(`Failed to add camera: ${error.message}`);
        return;
      }
      toast.success("Camera added");
      fetchCameras();
    },
    [activeOrganization, user, fetchCameras],
  );

  const updateCamera = useCallback(
    async (id: string, patch: Partial<Omit<Camera, "id">>) => {
      const { error } = await cameraDb
        .from("cameras")
        .update(patch)
        .eq("id", id);
      if (error) {
        toast.error("Update failed");
        return;
      }
      fetchCameras();
    },
    [fetchCameras],
  );

  const deleteCamera = useCallback(async (id: string) => {
    const { error } = await cameraDb.from("cameras").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Camera removed");
    setCameras((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    cameras,
    loading,
    addCamera,
    updateCamera,
    deleteCamera,
    refetch: fetchCameras,
  };
}
