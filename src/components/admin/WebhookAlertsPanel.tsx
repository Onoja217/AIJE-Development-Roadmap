import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bell, Check, Settings as SettingsIcon, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type AlertRow = {
  id: string;
  kind: "dead_letter" | "latency_p95";
  value: number;
  threshold: number;
  window_minutes: number;
  message: string;
  acknowledged: boolean;
  created_at: string;
};

type Settings = {
  user_id: string;
  enabled: boolean;
  dead_letter_threshold: number;
  latency_p95_threshold_ms: number;
  window_minutes: number;
  cooldown_minutes: number;
};

const DEFAULTS: Omit<Settings, "user_id"> = {
  enabled: true,
  dead_letter_threshold: 5,
  latency_p95_threshold_ms: 2000,
  window_minutes: 60,
  cooldown_minutes: 30,
};

export function WebhookAlertsPanel() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from("webhook_alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }).limit(20),
        supabase.from("webhook_alert_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setAlerts((a ?? []) as AlertRow[]);
      setSettings((s as Settings) ?? { user_id: user.id, ...DEFAULTS });
    })();

    const channel = supabase
      .channel("webhook-alerts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "webhook_alerts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as AlertRow;
          setAlerts((prev) => [row, ...prev]);
          toast.error("Webhook alert", { description: row.message });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function acknowledge(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("webhook_alerts").update({ acknowledged: true }).eq("id", id);
  }

  async function saveSettings() {
    if (!settings || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("webhook_alert_settings")
      .upsert({ ...settings, user_id: user.id }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Could not save", { description: error.message });
    else {
      toast.success("Alert thresholds saved");
      setOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active alerts</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <SettingsIcon className="h-4 w-4 mr-1" /> Thresholds
        </Button>
      </div>

      <AnimatePresence>
        {open && settings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="p-4 grid sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between sm:col-span-2">
                <Label htmlFor="enabled" className="text-sm">Alerting enabled</Label>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                />
              </div>
              <Field
                label="Dead-letter threshold (pending count)"
                value={settings.dead_letter_threshold}
                onChange={(n) => setSettings({ ...settings, dead_letter_threshold: n })}
              />
              <Field
                label="Latency p95 threshold (ms)"
                value={settings.latency_p95_threshold_ms}
                onChange={(n) => setSettings({ ...settings, latency_p95_threshold_ms: n })}
              />
              <Field
                label="Evaluation window (minutes)"
                value={settings.window_minutes}
                onChange={(n) => setSettings({ ...settings, window_minutes: n })}
              />
              <Field
                label="Cooldown between alerts (minutes)"
                value={settings.cooldown_minutes}
                onChange={(n) => setSettings({ ...settings, cooldown_minutes: n })}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button size="sm" onClick={saveSettings} disabled={saving}>Save thresholds</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No active alerts. Monitor runs every 5 minutes.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
            >
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-destructive">
                    {a.kind === "dead_letter" ? "Dead-letter overflow" : "Latency p95 breach"}
                  </div>
                  <div className="text-sm">{a.message}</div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleString()} · value {a.value} · threshold {a.threshold}
                  </div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => acknowledge(a.id)} title="Acknowledge">
                <Check className="h-4 w-4" />
              </Button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 0))}
      />
    </div>
  );
}
