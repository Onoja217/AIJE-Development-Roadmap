-- Site-scoped household sensor infrastructure.

INSERT INTO public.access_permissions (key, description) VALUES
  ('sensors.view', 'View household sensor status and alerts'),
  ('sensors.manage', 'Configure household gateways, devices and rules')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

WITH grants(role_key, permission_key) AS (VALUES
  ('household_owner', 'sensors.view'), ('household_owner', 'sensors.manage'),
  ('security_operator', 'sensors.view'),
  ('organization_admin', 'sensors.view'), ('organization_admin', 'sensors.manage'),
  ('platform_admin', 'sensors.view'), ('platform_admin', 'sensors.manage')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM grants
JOIN public.access_roles role ON role.key = grants.role_key
JOIN public.access_permissions permission ON permission.key = grants.permission_key
ON CONFLICT DO NOTHING;

ALTER TABLE public.sites
  ADD CONSTRAINT sites_id_organization_unique UNIQUE (id, organization_id);

CREATE TABLE public.sensor_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  serial_number text NOT NULL UNIQUE,
  connection_type text NOT NULL DEFAULT 'wifi' CHECK (connection_type IN ('wifi', 'ethernet', 'cellular', 'hybrid', 'demo')),
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning')),
  arm_mode text NOT NULL DEFAULT 'disarmed' CHECK (arm_mode IN ('disarmed', 'home', 'away')),
  battery_percent integer CHECK (battery_percent BETWEEN 0 AND 100),
  firmware_version text,
  last_seen_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, site_id),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.sensor_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  gateway_id uuid,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  device_type text NOT NULL CHECK (device_type IN ('door', 'motion', 'smoke', 'gas', 'water', 'panic', 'siren', 'power', 'camera', 'environment')),
  zone text NOT NULL DEFAULT 'Unassigned',
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning', 'alert', 'tampered')),
  battery_percent integer CHECK (battery_percent BETWEEN 0 AND 100),
  last_value text,
  last_seen_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, site_id),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (gateway_id, organization_id, site_id) REFERENCES public.sensor_gateways(id, organization_id, site_id) ON DELETE SET NULL (gateway_id)
);

CREATE TABLE public.sensor_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  device_id uuid,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_channels text[] NOT NULL DEFAULT ARRAY['push']::text[],
  escalation_minutes integer NOT NULL DEFAULT 5 CHECK (escalation_minutes BETWEEN 0 AND 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id, organization_id, site_id) REFERENCES public.sensor_devices(id, organization_id, site_id) ON DELETE SET NULL (device_id)
);

CREATE TABLE public.sensor_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  device_id uuid,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id, organization_id, site_id) REFERENCES public.sensor_devices(id, organization_id, site_id) ON DELETE SET NULL (device_id)
);

CREATE TABLE public.sensor_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  device_id uuid NOT NULL,
  reading_type text NOT NULL,
  value double precision,
  text_value text,
  unit text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id, organization_id, site_id) REFERENCES public.sensor_devices(id, organization_id, site_id) ON DELETE CASCADE
);

CREATE INDEX sensor_gateways_site_idx ON public.sensor_gateways(site_id);
CREATE INDEX sensor_devices_site_status_idx ON public.sensor_devices(site_id, status);
CREATE INDEX sensor_alerts_site_status_idx ON public.sensor_alerts(site_id, status, created_at DESC);
CREATE INDEX sensor_readings_device_recorded_idx ON public.sensor_readings(device_id, recorded_at DESC);

ALTER TABLE public.sensor_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensor viewers read gateways" ON public.sensor_gateways FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.view'));
CREATE POLICY "sensor managers manage gateways" ON public.sensor_gateways FOR ALL TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.manage'))
  WITH CHECK (public.current_user_has_permission(organization_id, 'sensors.manage'));
CREATE POLICY "sensor viewers read devices" ON public.sensor_devices FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.view'));
CREATE POLICY "sensor managers manage devices" ON public.sensor_devices FOR ALL TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.manage'))
  WITH CHECK (public.current_user_has_permission(organization_id, 'sensors.manage'));
CREATE POLICY "sensor viewers read rules" ON public.sensor_rules FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.view'));
CREATE POLICY "sensor managers manage rules" ON public.sensor_rules FOR ALL TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.manage'))
  WITH CHECK (public.current_user_has_permission(organization_id, 'sensors.manage'));
CREATE POLICY "sensor viewers read alerts" ON public.sensor_alerts FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.view'));
CREATE POLICY "sensor managers manage alerts" ON public.sensor_alerts FOR ALL TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.manage'))
  WITH CHECK (public.current_user_has_permission(organization_id, 'sensors.manage'));
CREATE POLICY "sensor viewers read readings" ON public.sensor_readings FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.view'));
CREATE POLICY "sensor managers insert readings" ON public.sensor_readings FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_permission(organization_id, 'sensors.manage'));

CREATE TRIGGER sensor_gateways_updated_at BEFORE UPDATE ON public.sensor_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sensor_devices_updated_at BEFORE UPDATE ON public.sensor_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sensor_rules_updated_at BEFORE UPDATE ON public.sensor_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sensor_gateways, public.sensor_devices, public.sensor_rules, public.sensor_alerts TO authenticated;
GRANT SELECT, INSERT ON public.sensor_readings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sensor_readings_id_seq TO authenticated, service_role;
GRANT ALL ON public.sensor_gateways, public.sensor_devices, public.sensor_rules, public.sensor_alerts, public.sensor_readings TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_gateways;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_alerts;
