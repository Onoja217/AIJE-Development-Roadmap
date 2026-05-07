ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS zone_cooldown_sec integer,
  ADD COLUMN IF NOT EXISTS zone_alert_severity text;

ALTER TABLE public.cameras
  ADD CONSTRAINT cameras_zone_alert_severity_check
  CHECK (zone_alert_severity IS NULL OR zone_alert_severity IN ('info','warning','danger'));