
-- Create storage bucket for camera media
INSERT INTO storage.buckets (id, name, public) VALUES ('camera-media', 'camera-media', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload camera media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'camera-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own media
CREATE POLICY "Users can view own camera media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'camera-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own media
CREATE POLICY "Users can delete own camera media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'camera-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create a table to track camera media metadata
CREATE TABLE public.camera_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('snapshot', 'recording')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camera_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own camera media"
ON public.camera_media FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own camera media"
ON public.camera_media FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own camera media"
ON public.camera_media FOR DELETE TO authenticated
USING (user_id = auth.uid());
