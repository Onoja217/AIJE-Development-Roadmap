import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type CommunityAlert = Database["public"]["Tables"]["community_alerts"]["Row"];
export type CommunityReport = Database["public"]["Tables"]["community_reports"]["Row"];
export type CommunityWatchGroup = Database["public"]["Tables"]["community_watch_groups"]["Row"];
export type ResourceLocation = Database["public"]["Tables"]["resource_locations"]["Row"];
export type FamilyReunification = Database["public"]["Tables"]["family_reunifications"]["Row"];

export function useCommunityData() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [groups, setGroups] = useState<CommunityWatchGroup[]>([]);
  const [resources, setResources] = useState<ResourceLocation[]>([]);
  const [families, setFamilies] = useState<FamilyReunification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [alertsRes, reportsRes, groupsRes, resourcesRes, familiesRes] = await Promise.all([
          supabase.from("community_alerts").select("*").order("created_at", { ascending: false }),
          supabase.from("community_reports").select("*").order("created_at", { ascending: false }),
          supabase.from("community_watch_groups").select("*").order("created_at", { ascending: false }),
          supabase.from("resource_locations").select("*").order("created_at", { ascending: false }),
          supabase.from("family_reunifications").select("*").order("created_at", { ascending: false }),
        ]);

        setAlerts(alertsRes.data ?? []);
        setReports(reportsRes.data ?? []);
        setGroups(groupsRes.data ?? []);
        setResources(resourcesRes.data ?? []);
        setFamilies(familiesRes.data ?? []);
      } catch (error) {
        console.error("Could not load community data", error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();

    const channel = supabase
      .channel("community-data")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_alerts" },
        (payload) => {
          setAlerts((prev) => [payload.new as CommunityAlert, ...prev].slice(0, 100));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_reports" },
        (payload) => {
          setReports((prev) => [payload.new as CommunityReport, ...prev].slice(0, 100));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_watch_groups" },
        (payload) => {
          setGroups((prev) => [payload.new as CommunityWatchGroup, ...prev].slice(0, 100));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resource_locations" },
        (payload) => {
          setResources((prev) => [payload.new as ResourceLocation, ...prev].slice(0, 100));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "family_reunifications" },
        (payload) => {
          setFamilies((prev) => [payload.new as FamilyReunification, ...prev].slice(0, 100));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { alerts, reports, groups, resources, families, loading };
}
