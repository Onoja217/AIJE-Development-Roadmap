CREATE TABLE public.smart_rule_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ignore_normal_movement BOOLEAN NOT NULL DEFAULT true,
  odd_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  odd_hours_start INTEGER NOT NULL DEFAULT 23,
  odd_hours_end INTEGER NOT NULL DEFAULT 6,
  repeated_motion_enabled BOOLEAN NOT NULL DEFAULT true,
  repeated_motion_count INTEGER NOT NULL DEFAULT 3,
  repeated_motion_window_sec INTEGER NOT NULL DEFAULT 300,
  unknown_pattern_enabled BOOLEAN NOT NULL DEFAULT true,
  unknown_pattern_sensitivity INTEGER NOT NULL DEFAULT 70,
  baseline JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own smart rules" ON public.smart_rule_configs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own smart rules" ON public.smart_rule_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own smart rules" ON public.smart_rule_configs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own smart rules" ON public.smart_rule_configs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_smart_rule_configs_updated_at
  BEFORE UPDATE ON public.smart_rule_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();