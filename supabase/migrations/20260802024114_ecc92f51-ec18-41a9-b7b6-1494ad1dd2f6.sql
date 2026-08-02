CREATE TABLE public.incident_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id text,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  contact text,
  address text,
  latitude double precision,
  longitude double precision,
  manual_location text,
  image_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO authenticated;
GRANT ALL ON public.incident_reports TO service_role;

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own incident reports"
ON public.incident_reports FOR ALL TO authenticated
USING (auth.uid() = reporter_id)
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all incident reports"
ON public.incident_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_incident_reports_updated_at
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
