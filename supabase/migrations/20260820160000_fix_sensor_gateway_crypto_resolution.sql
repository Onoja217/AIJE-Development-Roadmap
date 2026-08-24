-- pgcrypto is installed in Supabase's extensions schema. These SECURITY
-- DEFINER functions previously limited search_path to public, causing gateway
-- enrollment creation and consumption to fail at runtime.
ALTER FUNCTION public.create_sensor_gateway_enrollment(uuid, uuid, text)
  SET search_path = public, extensions;

ALTER FUNCTION public.consume_sensor_gateway_enrollment(text, text, text, text)
  SET search_path = public, extensions;
