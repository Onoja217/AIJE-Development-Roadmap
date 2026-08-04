import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ScanFace, UserCheck, Trash2, AlertTriangle, FileLock2, Upload, Loader2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useFaceRecognition } from "@/hooks/useFaceRecognition";
import { describeFromImage, ensureFaceModels } from "@/lib/faceApi";

export default function FaceRecognitionPage() {
  const {
    loading, consent, hasConsent, acceptConsent, revokeConsent,
    settings, updateSettings,
    enrollments, addEnrollment, deleteEnrollment,
    audit, purgeAllData,
  } = useFaceRecognition();

  // Consent form
  const [region, setRegion] = useState("");
  const [legalBasis, setLegalBasis] = useState("explicit_consent");
  const [ack, setAck] = useState(false);

  // Enrollment form
  const fileRef = useRef<HTMLInputElement>(null);
  const [enrollLabel, setEnrollLabel] = useState("");
  const [enrollRole, setEnrollRole] = useState<"trusted" | "staff">("trusted");
  const [enrollNotes, setEnrollNotes] = useState("");
  const [subjectAck, setSubjectAck] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async (file: File) => {
    if (!enrollLabel.trim()) return toast.error("Enter a label first");
    if (!subjectAck) return toast.error("Confirm the subject has consented");
    setEnrolling(true);
    try {
      await ensureFaceModels();
      const img = await loadImage(file);
      const desc = await describeFromImage(img);
      if (!desc) {
        toast.error("No clear face detected in that image");
        return;
      }
      await addEnrollment({
        label: enrollLabel.trim(),
        role: enrollRole,
        descriptor: desc,
        notes: enrollNotes.trim() || undefined,
        consent_subject_acknowledged: subjectAck,
      });
      setEnrollLabel("");
      setEnrollNotes("");
      setSubjectAck(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error("Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ============ HARD CONSENT GATE ============
  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 border-destructive/40 bg-destructive/5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-1" />
                <div className="space-y-2">
                  <h1 className="text-xl font-bold">Face Recognition — Disabled</h1>
                  <p className="text-sm text-muted-foreground">
                    Facial recognition processes biometric data, which is regulated in many jurisdictions
                    (GDPR Art. 9, BIPA, CCPA/CPRA, UK DPA, and others). It is <strong>disabled by default</strong>.
                    To enable it you must confirm a lawful basis and accept the terms below.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 mt-4 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><FileLock2 className="h-4 w-4" /> Consent & Legal Basis</h2>

              <div className="space-y-2">
                <Label>Your operating region</Label>
                <Input
                  placeholder="e.g. EU – Germany, US – California, UK"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Legal basis</Label>
                <Select value={legalBasis} onValueChange={setLegalBasis}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="explicit_consent">Explicit consent of all monitored subjects</SelectItem>
                    <SelectItem value="legitimate_interest">Legitimate interest (documented assessment)</SelectItem>
                    <SelectItem value="legal_obligation">Legal obligation (e.g. regulated facility)</SelectItem>
                    <SelectItem value="private_household">Strictly personal / household use</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2 text-muted-foreground">
                <p><strong>By enabling face recognition you confirm that:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>You have legal authority to process biometric data in your region.</li>
                  <li>All enrolled subjects have given informed consent and may withdraw at any time.</li>
                  <li>Recognition runs on-device. Only 128-dimension descriptors (not images) are stored in your account.</li>
                  <li>Audit logs are retained for the period set in Privacy controls and then deleted automatically.</li>
                  <li>You will not enroll a person without their knowledge, and you will not use this feature where prohibited (e.g. in some jurisdictions for surveillance of the general public).</li>
                </ul>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} className="mt-0.5" />
                <span>I acknowledge the above and accept full legal responsibility for use of this feature.</span>
              </label>

              <div className="flex gap-2">
                <Button
                  disabled={!ack || !region.trim()}
                  onClick={() => acceptConsent(region.trim(), legalBasis)}
                  className="flex-1"
                >
                  <UserCheck className="h-4 w-4 mr-2" /> Accept & Enable
                </Button>
              </div>
            </Card>
          </motion.div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ============ MAIN PAGE (post-consent) ============
  const trusted = enrollments.filter((e) => e.role === "trusted");
  const staff = enrollments.filter((e) => e.role === "staff");

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanFace className="h-6 w-6 text-primary" /> Face Recognition
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              On-device matching · {enrollments.length} enrolled · Consent: {consent?.legal_basis} ({consent?.region})
            </p>
          </div>
          <Badge variant={settings?.fr_enabled ? "default" : "secondary"}>
            {settings?.fr_enabled ? "ACTIVE" : "STANDBY"}
          </Badge>
        </div>

        <Tabs defaultValue="watchlist">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="enroll">Enroll</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          {/* WATCHLIST */}
          <TabsContent value="watchlist" className="space-y-3 mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Trusted / Household</h3>
                <Badge variant="outline">{trusted.length}</Badge>
              </div>
              <EnrollmentList items={trusted} onDelete={deleteEnrollment} />
            </Card>
            {staff.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Staff</h3>
                  <Badge variant="outline">{staff.length}</Badge>
                </div>
                <EnrollmentList items={staff} onDelete={deleteEnrollment} />
              </Card>
            )}
          </TabsContent>

          {/* ENROLL */}
          <TabsContent value="enroll" className="mt-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" /> Enroll a known person
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload a clear, front-facing photo. The image is processed locally; only a numerical descriptor is stored.
              </p>

              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={enrollLabel} onChange={(e) => setEnrollLabel(e.target.value)} placeholder="e.g. Sarah (spouse)" />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={enrollRole} onValueChange={(v) => setEnrollRole(v as "trusted" | "staff")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trusted">Trusted (household)</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={enrollNotes} onChange={(e) => setEnrollNotes(e.target.value)} placeholder="e.g. cleaner, Tuesdays" />
              </div>

              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={subjectAck} onCheckedChange={(v) => setSubjectAck(!!v)} className="mt-0.5" />
                <span>I confirm the subject has been informed and has consented to being enrolled.</span>
              </label>

              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                disabled={enrolling}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEnroll(f); }}
              />
              {enrolling && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing on-device…
                </p>
              )}
            </Card>
          </TabsContent>

          {/* PRIVACY */}
          <TabsContent value="privacy" className="mt-4 space-y-3">
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Recognition controls</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable face recognition</Label>
                  <p className="text-xs text-muted-foreground">Master switch. Disables all matching when off.</p>
                </div>
                <Switch
                  checked={!!settings?.fr_enabled}
                  onCheckedChange={(v) => updateSettings({ fr_enabled: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Suppress alerts for trusted matches</Label>
                  <p className="text-xs text-muted-foreground">Skip the alarm when a household member is detected.</p>
                </div>
                <Switch
                  checked={!!settings?.suppress_alerts_for_trusted}
                  onCheckedChange={(v) => updateSettings({ suppress_alerts_for_trusted: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Log unknown faces</Label>
                  <p className="text-xs text-muted-foreground">Record audit entries when a face doesn't match anyone enrolled.</p>
                </div>
                <Switch
                  checked={!!settings?.log_unknowns}
                  onCheckedChange={(v) => updateSettings({ log_unknowns: v })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Match strictness</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(settings?.match_threshold ?? 0.55).toFixed(2)}</span>
                </div>
                <Slider
                  value={[settings?.match_threshold ?? 0.55]}
                  min={0.35} max={0.75} step={0.01}
                  onValueChange={([v]) => updateSettings({ match_threshold: v })}
                />
                <p className="text-[10px] text-muted-foreground">Lower = stricter (fewer false matches). 0.55 recommended.</p>
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Retention</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Audit log retention (days)</Label>
                  <span className="text-xs font-mono text-muted-foreground">{settings?.audit_retention_days ?? 7}</span>
                </div>
                <Slider
                  value={[settings?.audit_retention_days ?? 7]}
                  min={1} max={90} step={1}
                  onValueChange={([v]) => updateSettings({ audit_retention_days: v })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Embedding retention (days, 0 = until deleted)</Label>
                  <span className="text-xs font-mono text-muted-foreground">{settings?.embedding_retention_days ?? 0}</span>
                </div>
                <Slider
                  value={[settings?.embedding_retention_days ?? 0]}
                  min={0} max={365} step={1}
                  onValueChange={([v]) => updateSettings({ embedding_retention_days: v })}
                />
              </div>
            </Card>

            <Card className="p-4 border-destructive/40 bg-destructive/5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Subject rights
              </h3>
              <p className="text-xs text-muted-foreground">
                Use these to honour deletion / withdrawal-of-consent requests.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={purgeAllData}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete all enrollments & audit
                </Button>
                <Button variant="destructive" onClick={revokeConsent}>
                  Revoke consent (disables feature)
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                Recognition audit log
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  ({audit.length} events · auto-purged after {settings?.audit_retention_days ?? 7}d)
                </span>
              </h3>
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No events yet.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {audit.map((row) => (
                    <div key={row.id} className="flex items-center justify-between border-b border-border/40 py-2 text-xs">
                      <div>
                        <div className="font-mono">{row.outcome}</div>
                        <div className="text-muted-foreground">
                          {row.camera_name ?? "—"} · {row.match_label ?? "unknown"}{row.confidence != null && ` · d=${Number(row.confidence).toFixed(2)}`}
                        </div>
                      </div>
                      <div className="text-muted-foreground tabular-nums">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}

function EnrollmentList({ items, onDelete }: { items: ReturnType<typeof useFaceRecognition>["enrollments"]; onDelete: (id: string) => void }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No one enrolled yet.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded-md border border-border/40 p-2">
          <div>
            <div className="text-sm font-medium">{e.label}</div>
            <div className="text-[10px] text-muted-foreground">
              {new Date(e.created_at).toLocaleDateString()} · {e.notes ?? "—"}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onDelete(e.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
