import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface FaceConsent {
  id: string;
  accepted: boolean;
  region: string | null;
  legal_basis: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface FacePrivacySettings {
  id: string;
  fr_enabled: boolean;
  suppress_alerts_for_trusted: boolean;
  match_threshold: number;
  audit_retention_days: number;
  embedding_retention_days: number;
  log_unknowns: boolean;
}

export interface FaceEnrollment {
  id: string;
  label: string;
  role: "trusted" | "staff";
  descriptor: number[];
  notes: string | null;
  consent_subject_acknowledged: boolean;
  created_at: string;
}

export interface FaceAuditRow {
  id: string;
  camera_name: string | null;
  match_label: string | null;
  confidence: number | null;
  outcome: string;
  created_at: string;
}

export function useFaceRecognition() {
  const { user } = useAuth();
  const [consent, setConsent] = useState<FaceConsent | null>(null);
  const [settings, setSettings] = useState<FacePrivacySettings | null>(null);
  const [enrollments, setEnrollments] = useState<FaceEnrollment[]>([]);
  const [audit, setAudit] = useState<FaceAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, s, e, a] = await Promise.all([
      supabase.from("face_consent").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("face_privacy_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("face_enrollments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("face_recognition_audit").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    ]);
    setConsent((c.data as FaceConsent | null) ?? null);
    setSettings((s.data as FacePrivacySettings | null) ?? null);
    setEnrollments(((e.data as FaceEnrollment[] | null) ?? []));
    setAudit(((a.data as FaceAuditRow[] | null) ?? []));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Auto-purge expired audit rows on load (uses DB function with user's retention setting)
  useEffect(() => {
    if (!user) return;
    supabase.rpc("purge_face_audit").then(() => { /* silent */ });
  }, [user]);

  const acceptConsent = useCallback(async (region: string, legalBasis: string) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      accepted: true,
      region,
      legal_basis: legalBasis,
      accepted_at: new Date().toISOString(),
      revoked_at: null,
    };
    if (consent) {
      await supabase.from("face_consent").update(payload).eq("id", consent.id);
    } else {
      await supabase.from("face_consent").insert(payload);
    }
    // Ensure settings row exists
    if (!settings) {
      await supabase.from("face_privacy_settings").insert({ user_id: user.id });
    }
    toast.success("Consent recorded");
    reload();
  }, [user, consent, settings, reload]);

  const revokeConsent = useCallback(async () => {
    if (!user || !consent) return;
    await supabase.from("face_consent").update({
      accepted: false,
      revoked_at: new Date().toISOString(),
    }).eq("id", consent.id);
    if (settings) {
      await supabase.from("face_privacy_settings").update({ fr_enabled: false }).eq("id", settings.id);
    }
    await supabase.from("face_recognition_audit").insert({
      user_id: user.id,
      outcome: "consent_revoked",
    });
    toast("Consent revoked. Face recognition disabled.");
    reload();
  }, [user, consent, settings, reload]);

  const updateSettings = useCallback(async (patch: Partial<FacePrivacySettings>) => {
    if (!user) return;
    if (settings) {
      await supabase.from("face_privacy_settings").update(patch).eq("id", settings.id);
    } else {
      await supabase.from("face_privacy_settings").insert({ user_id: user.id, ...patch });
    }
    reload();
  }, [user, settings, reload]);

  const addEnrollment = useCallback(async (input: { label: string; role: "trusted" | "staff"; descriptor: number[]; notes?: string; consent_subject_acknowledged: boolean }) => {
    if (!user) return;
    const { error } = await supabase.from("face_enrollments").insert({ user_id: user.id, ...input });
    if (error) {
      toast.error("Enrollment failed");
      return;
    }
    toast.success(`${input.label} enrolled`);
    reload();
  }, [user, reload]);

  const deleteEnrollment = useCallback(async (id: string) => {
    await supabase.from("face_enrollments").delete().eq("id", id);
    reload();
  }, [reload]);

  const purgeAllData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      supabase.from("face_enrollments").delete().eq("user_id", user.id),
      supabase.from("face_recognition_audit").delete().eq("user_id", user.id),
    ]);
    toast.success("All face data deleted");
    reload();
  }, [user, reload]);

  const logAudit = useCallback(async (row: { camera_name?: string; match_enrollment_id?: string; match_label?: string; confidence?: number; outcome: string }) => {
    if (!user) return;
    await supabase.from("face_recognition_audit").insert({ user_id: user.id, ...row });
  }, [user]);

  const hasConsent = !!(consent && consent.accepted);
  const isActive = hasConsent && !!settings?.fr_enabled;

  return {
    loading,
    consent, hasConsent, acceptConsent, revokeConsent,
    settings, updateSettings,
    enrollments, addEnrollment, deleteEnrollment,
    audit, logAudit, purgeAllData,
    isActive,
    reload,
  };
}
