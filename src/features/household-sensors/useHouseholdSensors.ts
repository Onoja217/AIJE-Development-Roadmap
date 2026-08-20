import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchHouseholdSensors } from "./sensorApi";

export function useHouseholdSensors(organizationId: string | undefined) {
  const query = useQuery({
    queryKey: ["household-sensors", organizationId],
    queryFn: () => fetchHouseholdSensors(organizationId!),
    enabled: Boolean(organizationId),
  });
  const { refetch } = query;

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`household-sensors-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sensor_gateways",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sensor_devices",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sensor_alerts",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sensor_gateway_commands",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, refetch]);

  return query;
}
