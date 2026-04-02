
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- System state (arm/disarm)
CREATE TABLE public.system_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  arm_status TEXT NOT NULL DEFAULT 'disarmed' CHECK (arm_status IN ('disarmed', 'armed-home', 'armed-away')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.system_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own state" ON public.system_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own state" ON public.system_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own state" ON public.system_state FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_system_state_updated_at BEFORE UPDATE ON public.system_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sensor configs
CREATE TABLE public.sensor_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensor_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sensitivity INTEGER NOT NULL DEFAULT 70,
  warning_threshold INTEGER NOT NULL DEFAULT 60,
  critical_threshold INTEGER NOT NULL DEFAULT 85,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sensor_key)
);
ALTER TABLE public.sensor_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own configs" ON public.sensor_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own configs" ON public.sensor_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own configs" ON public.sensor_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own configs" ON public.sensor_configs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_sensor_configs_updated_at BEFORE UPDATE ON public.sensor_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alert history
CREATE TABLE public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own alerts" ON public.alert_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own alerts" ON public.alert_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own alerts" ON public.alert_history FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_history;
