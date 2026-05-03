CREATE TABLE public.cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  stream_type TEXT NOT NULL DEFAULT 'hls',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cameras" ON public.cameras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cameras" ON public.cameras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cameras" ON public.cameras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cameras" ON public.cameras FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cameras_updated_at
BEFORE UPDATE ON public.cameras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();