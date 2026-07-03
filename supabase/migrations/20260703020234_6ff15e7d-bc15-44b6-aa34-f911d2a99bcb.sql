
-- Lock down avatars bucket: users can only read/write files under their own user_id folder
DROP POLICY IF EXISTS "Avatars read own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars insert own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars update own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars delete own" ON storage.objects;

CREATE POLICY "Avatars read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
