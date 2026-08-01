-- Community watch groups
CREATE TABLE public.community_watch_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  community TEXT NOT NULL,
  ward TEXT,
  leader_name TEXT,
  escalation_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_watch_groups TO authenticated;
GRANT ALL ON public.community_watch_groups TO service_role;
ALTER TABLE public.community_watch_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their watch groups" ON public.community_watch_groups
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Watch group members
CREATE TABLE public.community_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_watch_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_target TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_group_members TO authenticated;
GRANT ALL ON public.community_group_members TO service_role;
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their group members" ON public.community_group_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_watch_groups g WHERE g.id = group_id AND g.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.community_watch_groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));

-- Emergency contact directory used for alert dispatch and escalation
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_target TEXT,
  community TEXT,
  incident_types TEXT[] NOT NULL DEFAULT '{}',
  authority_level INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their emergency contacts" ON public.emergency_contacts
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Community alerts
CREATE TABLE public.community_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_id TEXT,
  incident_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  location TEXT NOT NULL,
  threat_level TEXT NOT NULL DEFAULT 'high',
  instructions TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active',
  escalation_level INTEGER NOT NULL DEFAULT 1,
  next_escalation_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_alerts TO authenticated;
GRANT ALL ON public.community_alerts TO service_role;
ALTER TABLE public.community_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their community alerts" ON public.community_alerts
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Alert targets (which groups received an alert)
CREATE TABLE public.community_alert_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.community_alerts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.community_watch_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_alert_targets TO authenticated;
GRANT ALL ON public.community_alert_targets TO service_role;
ALTER TABLE public.community_alert_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their alert targets" ON public.community_alert_targets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_alerts a WHERE a.id = alert_id AND a.owner_id = auth.uid()));

-- Delivery log
CREATE TABLE public.alert_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.community_alerts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alert_deliveries TO authenticated;
GRANT ALL ON public.alert_deliveries TO service_role;
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their alert deliveries" ON public.alert_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_alerts a WHERE a.id = alert_id AND a.owner_id = auth.uid()));

-- Escalation history
CREATE TABLE public.alert_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.community_alerts(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  reason TEXT,
  notified_contacts UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alert_escalations TO authenticated;
GRANT ALL ON public.alert_escalations TO service_role;
ALTER TABLE public.alert_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their alert escalations" ON public.alert_escalations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_alerts a WHERE a.id = alert_id AND a.owner_id = auth.uid()));

-- updated_at triggers
CREATE TRIGGER update_community_watch_groups_updated_at BEFORE UPDATE ON public.community_watch_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_group_members_updated_at BEFORE UPDATE ON public.community_group_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_alerts_updated_at BEFORE UPDATE ON public.community_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alert_deliveries_updated_at BEFORE UPDATE ON public.alert_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for feed and escalation queries
CREATE INDEX idx_community_alerts_owner_created ON public.community_alerts(owner_id, created_at DESC);
CREATE INDEX idx_community_alerts_status_escalation ON public.community_alerts(status, next_escalation_at);
CREATE INDEX idx_group_members_group ON public.community_group_members(group_id);
CREATE INDEX idx_emergency_contacts_owner ON public.emergency_contacts(owner_id);
CREATE INDEX idx_alert_deliveries_alert ON public.alert_deliveries(alert_id);