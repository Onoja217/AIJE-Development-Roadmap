-- Emergency Resource Map
-- Stores verified emergency facilities and essential community resources.

CREATE TABLE IF NOT EXISTS public.emergency_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  category text NOT NULL,
  description text,

  status text NOT NULL DEFAULT 'available',
  verification_status text NOT NULL DEFAULT 'pending',

  address text,
  community text,
  ward text,
  lga text NOT NULL,
  state text NOT NULL DEFAULT 'Benue',

  lat double precision NOT NULL,
  lng double precision NOT NULL,

  phone text,
  email text,
  contact_person text,

  services text[] NOT NULL DEFAULT ARRAY[]::text[],

  maximum_capacity integer,
  available_capacity integer,

  notes text,

  created_by uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE RESTRICT,

  verified_by uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,

  verified_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT emergency_resources_name_not_blank
    CHECK (length(trim(name)) > 0),

  CONSTRAINT emergency_resources_lga_not_blank
    CHECK (length(trim(lga)) > 0),

  CONSTRAINT emergency_resources_latitude_valid
    CHECK (lat BETWEEN -90 AND 90),

  CONSTRAINT emergency_resources_longitude_valid
    CHECK (lng BETWEEN -180 AND 180),

  CONSTRAINT emergency_resources_capacity_valid
    CHECK (
      maximum_capacity IS NULL
      OR maximum_capacity >= 0
    ),

  CONSTRAINT emergency_resources_available_capacity_valid
    CHECK (
      available_capacity IS NULL
      OR available_capacity >= 0
    ),

  CONSTRAINT emergency_resources_capacity_relationship_valid
    CHECK (
      maximum_capacity IS NULL
      OR available_capacity IS NULL
      OR available_capacity <= maximum_capacity
    ),

  CONSTRAINT emergency_resources_verification_status_valid
    CHECK (
      verification_status IN (
        'pending',
        'verified',
        'rejected'
      )
    )
);

CREATE INDEX IF NOT EXISTS emergency_resources_category_idx
  ON public.emergency_resources(category);

CREATE INDEX IF NOT EXISTS emergency_resources_status_idx
  ON public.emergency_resources(status);

CREATE INDEX IF NOT EXISTS emergency_resources_verification_status_idx
  ON public.emergency_resources(verification_status);

CREATE INDEX IF NOT EXISTS emergency_resources_lga_idx
  ON public.emergency_resources(lga);

CREATE INDEX IF NOT EXISTS emergency_resources_location_idx
  ON public.emergency_resources(lat, lng);

CREATE INDEX IF NOT EXISTS emergency_resources_created_by_idx
  ON public.emergency_resources(created_by);

CREATE OR REPLACE FUNCTION public.set_emergency_resource_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_emergency_resource_updated_at
  ON public.emergency_resources;

CREATE TRIGGER set_emergency_resource_updated_at
BEFORE UPDATE ON public.emergency_resources
FOR EACH ROW
EXECUTE FUNCTION public.set_emergency_resource_updated_at();

ALTER TABLE public.emergency_resources ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.emergency_resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.emergency_resources TO authenticated;
GRANT ALL ON public.emergency_resources TO service_role;

-- Anyone can view resources that have been verified.
DROP POLICY IF EXISTS "Public can view verified emergency resources"
  ON public.emergency_resources;

CREATE POLICY "Public can view verified emergency resources"
  ON public.emergency_resources
  FOR SELECT
  TO anon, authenticated
  USING (verification_status = 'verified');

-- Administrators and moderators can review pending or rejected resources.
DROP POLICY IF EXISTS "Resource managers can view all emergency resources"
  ON public.emergency_resources;

CREATE POLICY "Resource managers can view all emergency resources"
  ON public.emergency_resources
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Administrators and moderators can create resource records.
DROP POLICY IF EXISTS "Resource managers can create emergency resources"
  ON public.emergency_resources;

CREATE POLICY "Resource managers can create emergency resources"
  ON public.emergency_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );

-- Administrators and moderators can update resource information.
DROP POLICY IF EXISTS "Resource managers can update emergency resources"
  ON public.emergency_resources;

CREATE POLICY "Resource managers can update emergency resources"
  ON public.emergency_resources
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Only administrators can permanently delete resource records.
DROP POLICY IF EXISTS "Admins can delete emergency resources"
  ON public.emergency_resources;

CREATE POLICY "Admins can delete emergency resources"
  ON public.emergency_resources
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
