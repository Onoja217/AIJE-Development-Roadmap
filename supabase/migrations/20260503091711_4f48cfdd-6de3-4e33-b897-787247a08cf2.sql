ALTER TABLE public.smart_rule_configs
ADD COLUMN IF NOT EXISTS auto_snapshot_interval_sec INTEGER NOT NULL DEFAULT 15;