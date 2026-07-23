import { supabase } from "../integrations/supabase/client";
import type { EmergencyResource } from "../types/resource";

export class ResourceService {
  static async getResources(): Promise<EmergencyResource[]> {
    const { data, error } = await supabase
      .from("emergency_resources")
      .select("*")
      .order("name");

    if (error) {
      throw error;
    }

    return (data ?? []) as EmergencyResource[];
  }

  static async getResource(id: string): Promise<EmergencyResource> {
    const { data, error } = await supabase
      .from("emergency_resources")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data as EmergencyResource;
  }

  static async createResource(
    resource: Partial<EmergencyResource>
  ): Promise<EmergencyResource> {
    const { data, error } = await supabase
      .from("emergency_resources")
      .insert(resource)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as EmergencyResource;
  }

  static async updateResource(
    id: string,
    updates: Partial<EmergencyResource>
  ): Promise<EmergencyResource> {
    const { data, error } = await supabase
      .from("emergency_resources")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as EmergencyResource;
  }

  static async deleteResource(id: string): Promise<void> {
    const { error } = await supabase
      .from("emergency_resources")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
