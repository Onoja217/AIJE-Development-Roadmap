-- Physical gateway enrollment, signed-message replay protection and commands.

ALTER TABLE public.sensor_gateways
  ADD COLUMN public_key_spki text,
  ADD COLUMN protocol_version integer NOT NULL DEFAULT 1 CHECK (protocol_version BETWEEN 1 AND 10),
  ADD COLUMN enrolled_at timestamptz,
  ADD CONSTRAINT physical_gateways_require_key CHECK (is_demo OR public_key_spki IS NOT NULL);

ALTER TABLE public.sensor_devices ADD COLUMN hardware_id text;
ALTER TABLE public.sensor_devices
  ADD CONSTRAINT sensor_devices_gateway_hardware_unique UNIQUE (gateway_id, hardware_id);

CREATE TABLE public.sensor_gateway_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  claim_token_hash bytea NOT NULL UNIQUE,
  gateway_name text NOT NULL CHECK (char_length(gateway_name) BETWEEN 2 AND 120),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.sensor_gateway_messages (
  gateway_id uuid NOT NULL REFERENCES public.sensor_gateways(id) ON DELETE CASCADE,
  nonce text NOT NULL CHECK (nonce ~ '^[A-Za-z0-9_-]{16,96}$'),
  sent_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gateway_id, nonce)
);

CREATE TABLE public.sensor_gateway_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL,
  gateway_id uuid NOT NULL,
  command_type text NOT NULL CHECK (command_type IN ('set_arm_mode', 'test_siren', 'restart', 'sync_config')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'delivered', 'acknowledged', 'failed', 'expired')),
  error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  FOREIGN KEY (site_id, organization_id) REFERENCES public.sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (gateway_id, organization_id, site_id) REFERENCES public.sensor_gateways(id, organization_id, site_id) ON DELETE CASCADE
);

CREATE INDEX sensor_enrollments_expiry_idx ON public.sensor_gateway_enrollments(expires_at) WHERE consumed_at IS NULL;
CREATE INDEX sensor_commands_gateway_status_idx ON public.sensor_gateway_commands(gateway_id, status, created_at);
CREATE INDEX sensor_messages_received_idx ON public.sensor_gateway_messages(received_at);

ALTER TABLE public.sensor_gateway_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_gateway_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_gateway_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensor managers view enrollments" ON public.sensor_gateway_enrollments FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.manage'));
CREATE POLICY "sensor managers view messages" ON public.sensor_gateway_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sensor_gateways gateway
    WHERE gateway.id = gateway_id
      AND public.current_user_has_permission(gateway.organization_id, 'sensors.manage')
  ));
CREATE POLICY "sensor viewers read commands" ON public.sensor_gateway_commands FOR SELECT TO authenticated
  USING (public.current_user_has_permission(organization_id, 'sensors.view'));
CREATE POLICY "sensor managers create commands" ON public.sensor_gateway_commands FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_permission(organization_id, 'sensors.manage') AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.create_sensor_gateway_enrollment(
  _organization_id uuid,
  _site_id uuid,
  _gateway_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  raw_token text := encode(gen_random_bytes(24), 'hex');
  enrollment_id uuid;
  expiry timestamptz := now() + interval '15 minutes';
BEGIN
  IF NOT public.current_user_has_permission(_organization_id, 'sensors.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = _site_id AND organization_id = _organization_id) THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  INSERT INTO public.sensor_gateway_enrollments(
    organization_id, site_id, claim_token_hash, gateway_name, expires_at, created_by
  ) VALUES (
    _organization_id, _site_id, digest(raw_token, 'sha256'), trim(_gateway_name), expiry, auth.uid()
  ) RETURNING id INTO enrollment_id;

  RETURN jsonb_build_object('id', enrollment_id, 'claim_token', raw_token, 'expires_at', expiry);
END
$$;

CREATE OR REPLACE FUNCTION public.consume_sensor_gateway_enrollment(
  _claim_token text,
  _serial_number text,
  _public_key_spki text,
  _firmware_version text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  enrollment public.sensor_gateway_enrollments%ROWTYPE;
  gateway_id uuid;
BEGIN
  SELECT * INTO enrollment
  FROM public.sensor_gateway_enrollments
  WHERE claim_token_hash = digest(_claim_token, 'sha256')
    AND consumed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF enrollment.id IS NULL THEN RAISE EXCEPTION 'Invalid or expired claim token'; END IF;
  IF _serial_number !~ '^[A-Za-z0-9._-]{4,120}$' THEN RAISE EXCEPTION 'Invalid serial number'; END IF;
  IF char_length(_public_key_spki) NOT BETWEEN 40 AND 1024 THEN RAISE EXCEPTION 'Invalid public key'; END IF;

  INSERT INTO public.sensor_gateways(
    organization_id, site_id, name, serial_number, connection_type, status,
    arm_mode, firmware_version, public_key_spki, enrolled_at, is_demo
  ) VALUES (
    enrollment.organization_id, enrollment.site_id, enrollment.gateway_name,
    _serial_number, 'hybrid', 'offline', 'disarmed', _firmware_version,
    _public_key_spki, now(), false
  ) RETURNING id INTO gateway_id;

  UPDATE public.sensor_gateway_enrollments SET consumed_at = now() WHERE id = enrollment.id;
  RETURN jsonb_build_object('gateway_id', gateway_id, 'protocol_version', 1);
END
$$;

CREATE OR REPLACE FUNCTION public.ingest_sensor_gateway_telemetry(
  _gateway_id uuid,
  _nonce text,
  _sent_at timestamptz,
  _gateway_status jsonb,
  _readings jsonb,
  _alerts jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  gateway public.sensor_gateways%ROWTYPE;
  reading jsonb;
  alert jsonb;
BEGIN
  SELECT * INTO gateway FROM public.sensor_gateways WHERE id = _gateway_id AND NOT is_demo FOR UPDATE;
  IF gateway.id IS NULL THEN RAISE EXCEPTION 'Unknown physical gateway'; END IF;

  INSERT INTO public.sensor_gateway_messages(gateway_id, nonce, sent_at)
  VALUES (_gateway_id, _nonce, _sent_at);

  UPDATE public.sensor_gateways SET
    status = 'online',
    battery_percent = (_gateway_status ->> 'battery_percent')::integer,
    firmware_version = _gateway_status ->> 'firmware_version',
    connection_type = COALESCE(_gateway_status ->> 'connection_type', connection_type),
    last_seen_at = now()
  WHERE id = _gateway_id;

  FOR reading IN SELECT value FROM jsonb_array_elements(_readings) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.sensor_devices
      WHERE id = (reading ->> 'device_id')::uuid AND gateway_id = _gateway_id
    ) THEN RAISE EXCEPTION 'Reading references unknown device'; END IF;

    INSERT INTO public.sensor_readings(
      organization_id, site_id, device_id, reading_type, value, text_value, unit, recorded_at
    ) VALUES (
      gateway.organization_id, gateway.site_id, (reading ->> 'device_id')::uuid,
      reading ->> 'reading_type', (reading ->> 'value')::double precision,
      reading ->> 'text_value', reading ->> 'unit', _sent_at
    );
    UPDATE public.sensor_devices SET
      status = reading ->> 'status',
      battery_percent = (reading ->> 'battery_percent')::integer,
      last_value = reading ->> 'last_value',
      last_seen_at = now()
    WHERE id = (reading ->> 'device_id')::uuid AND gateway_id = _gateway_id;
  END LOOP;

  FOR alert IN SELECT value FROM jsonb_array_elements(_alerts) LOOP
    IF alert ->> 'device_id' IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.sensor_devices
      WHERE id = (alert ->> 'device_id')::uuid AND gateway_id = _gateway_id
    ) THEN RAISE EXCEPTION 'Alert references unknown device'; END IF;

    INSERT INTO public.sensor_alerts(
      organization_id, site_id, device_id, alert_type, severity, message
    ) VALUES (
      gateway.organization_id, gateway.site_id, (alert ->> 'device_id')::uuid,
      alert ->> 'alert_type', alert ->> 'severity', alert ->> 'message'
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.ack_sensor_gateway_command(
  _gateway_id uuid,
  _command_id uuid,
  _status text,
  _error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  command public.sensor_gateway_commands%ROWTYPE;
  requested_mode text;
BEGIN
  IF _status NOT IN ('acknowledged', 'failed') THEN RAISE EXCEPTION 'Invalid command status'; END IF;
  SELECT * INTO command FROM public.sensor_gateway_commands
  WHERE id = _command_id AND gateway_id = _gateway_id AND status IN ('queued', 'delivered')
  FOR UPDATE;
  IF command.id IS NULL THEN RAISE EXCEPTION 'Command not found'; END IF;

  UPDATE public.sensor_gateway_commands SET
    status = _status,
    error = CASE WHEN _status = 'failed' THEN left(_error, 500) ELSE NULL END,
    acknowledged_at = now()
  WHERE id = _command_id;

  IF _status = 'acknowledged' AND command.command_type = 'set_arm_mode' THEN
    requested_mode := command.payload ->> 'mode';
    IF requested_mode NOT IN ('disarmed', 'home', 'away') THEN RAISE EXCEPTION 'Invalid arm mode command'; END IF;
    UPDATE public.sensor_gateways SET arm_mode = requested_mode WHERE id = _gateway_id;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.create_sensor_gateway_enrollment(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sensor_gateway_enrollment(uuid, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.consume_sensor_gateway_enrollment(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_sensor_gateway_enrollment(text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.ingest_sensor_gateway_telemetry(uuid, text, timestamptz, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_sensor_gateway_telemetry(uuid, text, timestamptz, jsonb, jsonb, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.ack_sensor_gateway_command(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ack_sensor_gateway_command(uuid, uuid, text, text) TO service_role;

GRANT SELECT ON public.sensor_gateway_enrollments, public.sensor_gateway_messages, public.sensor_gateway_commands TO authenticated;
GRANT INSERT ON public.sensor_gateway_commands TO authenticated;
GRANT ALL ON public.sensor_gateway_enrollments, public.sensor_gateway_messages, public.sensor_gateway_commands TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_gateway_commands;
