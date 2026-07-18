-- supabase/migrations/20260718120000_create_emergency_reports.sql
--
-- Creates the emergency_reports table (this feature has no existing table
-- in the schema — cameras/face_enrollments/alert_history etc. all serve a
-- different product surface) plus the storage bucket for report images,
-- which was incorrectly assumed to already exist and needs provisioning
-- here.

-- =============================================================================
-- TABLE: emergency_reports
-- =============================================================================
-- Design notes:
--  - `id` is NOT server-generated (no DEFAULT gen_random_uuid()) — it is
--    supplied by the client and doubles as the idempotency key. Accepting
--    a client-supplied primary key is what makes retried sync attempts
--    safe: the same logical report always has the same id, so a retry
--    after a dropped response upserts the same row instead of creating a
--    duplicate.
--  - `client_version` / `server_version` implement optimistic concurrency:
--    the Edge Function compares the incoming client_version against the
--    stored server_version to detect whether another device modified this
--    report first (see emergency-report-sync/index.ts). server_version is
--    a monotonic integer incremented server-side on every accepted write —
--    NOT a wall-clock timestamp, which can skew across devices and produce
--    a wrong ordering.
--  - `image_paths` stores Supabase Storage paths (jsonb: { imageId: path }),
--    not image bytes — actual image data lives in the emergency-report-images
--    bucket, keeping this table's rows small regardless of photo volume.
CREATE TABLE IF NOT EXISTS public.emergency_reports (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  reported_at timestamptz NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact text,
  image_paths jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_version integer NOT NULL DEFAULT 1,
  server_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT emergency_reports_title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT emergency_reports_description_not_empty CHECK (char_length(trim(description)) > 0),
  CONSTRAINT emergency_reports_status_valid CHECK (status IN ('received', 'acknowledged', 'resolved'))
);

-- Index for "my reports" queries and the status board, mirroring the
-- alert_history/webhook_alerts pattern of indexing on user_id + created_at.
CREATE INDEX IF NOT EXISTS idx_emergency_reports_user_created
  ON public.emergency_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_reports_status
  ON public.emergency_reports (status);

-- Keep updated_at accurate on every row change, matching the convention
-- implied by other tables in this schema having both created_at/updated_at.
CREATE OR REPLACE FUNCTION public.set_emergency_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emergency_reports_updated_at ON public.emergency_reports;
CREATE TRIGGER trg_emergency_reports_updated_at
  BEFORE UPDATE ON public.emergency_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_emergency_reports_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports, and admins/moderators (via the existing
-- has_role() function) can see all reports — necessary for anyone actually
-- responding to incidents, not just the reporter.
CREATE POLICY "Users can view own reports, staff can view all"
  ON public.emergency_reports
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Inserts happen exclusively through the emergency-report-sync Edge
-- Function using the service-role key (see index.ts), which bypasses RLS
-- entirely — this policy exists as defense-in-depth in case a client ever
-- attempts a direct insert, and still scopes it to the user's own reports.
CREATE POLICY "Users can insert own reports"
  ON public.emergency_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only staff can update status (e.g. acknowledging/resolving a report) —
-- regular users should not be able to mark their own emergency as resolved,
-- that determination belongs to whoever is responding to it.
CREATE POLICY "Staff can update reports"
  ON public.emergency_reports
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- =============================================================================
-- STORAGE BUCKET: emergency-report-images
-- =============================================================================
-- Private (public = false): these images can depict people, locations, and
-- sensitive incident details — access must go through signed URLs generated
-- for authorized viewers, not a permanently public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emergency-report-images',
  'emergency-report-images',
  false,
  5242880, -- 5MB per object; client already compresses to ~1MB, this is a hard server-side ceiling
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Object paths are `${user_id}/${report_id}/${image_id}.${ext}` (see
-- syncClient.ts). IMPORTANT: images are uploaded to Storage BEFORE the
-- corresponding emergency_reports row exists (the Edge Function creates
-- the row only after images are already in place — see index.ts) — so a
-- policy that joins against emergency_reports, as an earlier draft of
-- this migration did, would always fail: the row it's checking for
-- doesn't exist yet at upload time. Scoping directly by user_id in the
-- path (the standard Supabase Storage RLS pattern) avoids that
-- chicken-and-egg problem entirely, since it only depends on who the
-- authenticated uploader is, not on any other table's state.
CREATE POLICY "Users can upload their own report images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'emergency-report-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Read access still needs to also allow staff to view any user's images
-- (they must be able to see the photos attached to reports they're
-- responding to), so this one DOES join emergency_reports — safe here
-- because by read time the row is guaranteed to already exist.
CREATE POLICY "Users can view own images, staff can view all"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'emergency-report-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );