// In-app notification helpers.
//
// Notifications are stored in Supabase (`public.notifications`) and scoped to
// the signed-in user by RLS. SMS/WhatsApp delivery is intentionally NOT wired
// here — only in-app notifications are produced.

import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory =
  | "incident"
  | "community_alert"
  | "ai_detection"
  | "system"
  | "auth";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface AppNotification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface CreateNotificationInput {
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  string
> = {
  incident: "Incident",
  community_alert: "Community alert",
  ai_detection: "AI detection",
  system: "System",
  auth: "Authentication",
};

export const NOTIFICATION_PRIORITY_LABELS: Record<
  NotificationPriority,
  string
> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

/**
 * Create a notification for the current user.
 * Never throws — notifications must never break the calling workflow.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { error } = await supabase.from("notifications").insert({
      user_id: user.id,
      category: input.category,
      priority: input.priority ?? "normal",
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: (input.metadata ?? {}) as never,
    });

    return !error;
  } catch {
    return false;
  }
}
