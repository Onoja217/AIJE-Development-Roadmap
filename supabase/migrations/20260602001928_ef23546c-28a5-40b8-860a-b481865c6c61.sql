
-- Consent log (hard gate)
CREATE TABLE public.face_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  region text,
  legal_basis text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_consent TO authenticated;
GRANT ALL ON public.face_consent TO service_role;
ALTER TABLE public.face_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent self select" ON public.face_consent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consent self insert" ON public.face_consent FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consent self update" ON public.face_consent FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "consent self delete" ON public.face_consent FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER face_consent_updated BEFORE UPDATE ON public.face_consent FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Privacy / retention settings
CREATE TABLE public.face_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  fr_enabled boolean NOT NULL DEFAULT false,
  suppress_alerts_for_trusted boolean NOT NULL DEFAULT true,
  match_threshold numeric NOT NULL DEFAULT 0.55,
  audit_retention_days integer NOT NULL DEFAULT 7,
  embedding_retention_days integer NOT NULL DEFAULT 0, -- 0 = keep until deleted
  log_unknowns boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_privacy_settings TO authenticated;
GRANT ALL ON public.face_privacy_settings TO service_role;
ALTER TABLE public.face_privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fps self select" ON public.face_privacy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fps self insert" ON public.face_privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fps self update" ON public.face_privacy_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fps self delete" ON public.face_privacy_settings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER face_privacy_updated BEFORE UPDATE ON public.face_privacy_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enrolled trusted / known people (128-d descriptor stored as float array)
CREATE TABLE public.face_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  role text NOT NULL DEFAULT 'trusted', -- 'trusted' | 'staff'
  descriptor double precision[] NOT NULL,
  notes text,
  consent_subject_acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_enrollments TO authenticated;
GRANT ALL ON public.face_enrollments TO service_role;
ALTER TABLE public.face_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fe self select" ON public.face_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fe self insert" ON public.face_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fe self update" ON public.face_enrollments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fe self delete" ON public.face_enrollments FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER face_enrollments_updated BEFORE UPDATE ON public.face_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX face_enrollments_user_idx ON public.face_enrollments(user_id);

-- Audit log
CREATE TABLE public.face_recognition_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  camera_name text,
  match_enrollment_id uuid,
  match_label text,
  confidence numeric,
  outcome text NOT NULL, -- 'matched_trusted' | 'unknown' | 'suppressed_alert' | 'consent_revoked'
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_recognition_audit TO authenticated;
GRANT ALL ON public.face_recognition_audit TO service_role;
ALTER TABLE public.face_recognition_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fra self select" ON public.face_recognition_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fra self insert" ON public.face_recognition_audit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fra self delete" ON public.face_recognition_audit FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX fra_user_created_idx ON public.face_recognition_audit(user_id, created_at DESC);

-- Retention purge function (callable by user; uses their own settings)
CREATE OR REPLACE FUNCTION public.purge_face_audit()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  retention integer;
  deleted_count integer;
BEGIN
  SELECT audit_retention_days INTO retention FROM public.face_privacy_settings WHERE user_id = auth.uid();
  IF retention IS NULL OR retention <= 0 THEN
    RETURN 0;
  END IF;
  WITH del AS (
    DELETE FROM public.face_recognition_audit
    WHERE user_id = auth.uid()
      AND created_at < now() - (retention || ' days')::interval
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM del;
  RETURN COALESCE(deleted_count, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.purge_face_audit() TO authenticated;
