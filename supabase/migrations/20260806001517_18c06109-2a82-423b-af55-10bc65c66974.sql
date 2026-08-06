CREATE TABLE public.safebenue_early_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'security',
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  community text NOT NULL,
  ward text,
  latitude double precision,
  longitude double precision,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safebenue_warning_severity_chk CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT safebenue_warning_status_chk CHECK (status IN ('active','resolved','false_alarm')),
  CONSTRAINT safebenue_warning_title_len CHECK (char_length(title) BETWEEN 3 AND 160),
  CONSTRAINT safebenue_warning_desc_len CHECK (char_length(description) BETWEEN 3 AND 2000)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safebenue_early_warnings TO authenticated;
GRANT ALL ON public.safebenue_early_warnings TO service_role;
ALTER TABLE public.safebenue_early_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view early warnings"
  ON public.safebenue_early_warnings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can post early warnings"
  ON public.safebenue_early_warnings FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins can update early warnings"
  ON public.safebenue_early_warnings FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors or admins can delete early warnings"
  ON public.safebenue_early_warnings FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX safebenue_early_warnings_created_idx ON public.safebenue_early_warnings (created_at DESC);

CREATE TRIGGER safebenue_early_warnings_updated
  BEFORE UPDATE ON public.safebenue_early_warnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.safebenue_warning_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_id uuid NOT NULL REFERENCES public.safebenue_early_warnings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warning_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.safebenue_warning_confirmations TO authenticated;
GRANT ALL ON public.safebenue_warning_confirmations TO service_role;
ALTER TABLE public.safebenue_warning_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view confirmations"
  ON public.safebenue_warning_confirmations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can confirm warnings"
  ON public.safebenue_warning_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can remove own confirmation"
  ON public.safebenue_warning_confirmations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX safebenue_warning_confirmations_warning_idx ON public.safebenue_warning_confirmations (warning_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.safebenue_early_warnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safebenue_warning_confirmations;