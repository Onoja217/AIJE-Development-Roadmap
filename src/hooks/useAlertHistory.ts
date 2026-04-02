import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface AlertRecord {
  id: string;
  sensor_type: string;
  severity: string;
  message: string;
  value: number | null;
  created_at: string;
}

export function useAlertHistory(user: User | null) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("alert_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) setAlerts(data);
    };

    fetchAlerts();

    const channel = supabase
      .channel("alert_history_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_history", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setAlerts((prev) => [payload.new as AlertRecord, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addAlert = useCallback(async (alert: { sensor_type: string; severity: string; message: string; value?: number }) => {
    if (!user) return;
    await supabase.from("alert_history").insert({
      user_id: user.id,
      sensor_type: alert.sensor_type,
      severity: alert.severity,
      message: alert.message,
      value: alert.value ?? null,
    });
  }, [user]);

  return { alerts, addAlert };
}
