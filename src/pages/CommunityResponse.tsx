import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Users, ShieldCheck, MapPin, HeartHandshake, Wifi, Globe2, Sparkles } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCommunityData } from "@/hooks/useCommunityData";
import { useCommunitySync } from "@/hooks/useCommunitySync";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

const CATEGORY_OPTIONS = ["Attack", "Suspicious activity", "Roadblock", "Shelter need", "Other"];
const RESOURCE_TYPES = ["Water", "Food", "Shelter", "Medical", "Transport"];

export default function CommunityResponse() {
  const { user } = useAuth();
  const { alerts, reports, groups, resources, families, loading } = useCommunityData();
  const { online, pending, syncAll, queueAlert, queueReport, queueGroup, queueResource, queueFamily } = useCommunitySync(user);
  const { language, setLanguage, t, languages } = useLanguage();
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [report, setReport] = useState({ category: CATEGORY_OPTIONS[0], location: "", details: "", contact_phone: "" });
  const [group, setGroup] = useState({ group_name: "", area: "", members_count: 5, contact_phone: "", notes: "" });
  const [resource, setResource] = useState({ name: "", resource_type: RESOURCE_TYPES[0], description: "", address: "", contact_phone: "", is_safe: true });
  const [family, setFamily] = useState({ name: "", relation: "", last_seen_location: "", last_seen_date: "", contact_phone: "", status: "missing", notes: "" });
  const [compact, setCompact] = useState(false);

  const alertPreview = useMemo(() => {
    if (!alertTitle && !alertMessage) return t("lowDataHint");
    return `${alertTitle || t("alertPreviewPrefix")}: ${alertMessage}`;
  }, [alertTitle, alertMessage, t]);

  const handleSendAlert = async () => {
    if (!user) return;
    if (!alertMessage.trim()) {
      toast.error(t("alertMessageRequired"));
      return;
    }
    await queueAlert({
      title: alertTitle || t("alertPreviewPrefix"),
      message: alertMessage.trim(),
      priority: "high",
      channel: "sms",
    });
    toast.success(t("alertDelivered"));
    setAlertTitle("");
    setAlertMessage("");
  };

  const handleQueueReport = async () => {
    if (!user) return;
    if (!report.details.trim()) {
      toast.error(t("reportDetailsRequired"));
      return;
    }
    await queueReport({
      category: report.category,
      location: report.location,
      details: report.details.trim(),
      contact_phone: report.contact_phone,
    });
    toast.success(t("recordSaved"));
    setReport({ category: CATEGORY_OPTIONS[0], location: "", details: "", contact_phone: "" });
  };

  const handleAddGroup = async () => {
    if (!user) return;
    if (!group.group_name.trim()) {
      toast.error(t("groupNameRequired"));
      return;
    }
    await queueGroup({
      group_name: group.group_name.trim(),
      area: group.area,
      members_count: group.members_count,
      contact_phone: group.contact_phone,
      notes: group.notes,
    });
    toast.success(t("groupSaved"));
    setGroup({ group_name: "", area: "", members_count: 5, contact_phone: "", notes: "" });
  };

  const handleAddResource = async () => {
    if (!user) return;
    if (!resource.name.trim()) {
      toast.error(t("resourceNameRequired"));
      return;
    }
    await queueResource({
      name: resource.name.trim(),
      resource_type: resource.resource_type,
      description: resource.description,
      address: resource.address,
      contact_phone: resource.contact_phone,
      is_safe: resource.is_safe,
    });
    toast.success(t("resourceSaved"));
    setResource({ name: "", resource_type: RESOURCE_TYPES[0], description: "", address: "", contact_phone: "", is_safe: true });
  };

  const handleAddFamily = async () => {
    if (!user) return;
    if (!family.name.trim()) {
      toast.error(t("familyNameRequired"));
      return;
    }
    await queueFamily({
      name: family.name.trim(),
      relation: family.relation,
      last_seen_location: family.last_seen_location,
      last_seen_date: family.last_seen_date,
      contact_phone: family.contact_phone,
      status: family.status,
      notes: family.notes,
    });
    toast.success(t("familySaved"));
    setFamily({ name: "", relation: "", last_seen_location: "", last_seen_date: "", contact_phone: "", status: "missing", notes: "" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">{t("communityTitle")}</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{t("communitySubtitle")}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setCompact((prev) => !prev)}>
                    {t("compactMode")}
                  </Button>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as "en" | "id")}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Object.entries(languages).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">{online ? t("onlineStatus") : t("offlineStatus")}</CardTitle>
                  <CardDescription>{online ? "Network connected" : t("offlineHelp")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between rounded-md border border-border/80 bg-background/80 px-3 py-2">
                      <span>{t("pendingQueue")}</span>
                      <span className="font-semibold tabular-nums">{pending.alerts + pending.reports + pending.groups + pending.resources + pending.family}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <BadgeStat label="Alerts" value={String(pending.alerts)} />
                      <BadgeStat label="Reports" value={String(pending.reports)} />
                      <BadgeStat label="Watch" value={String(pending.groups)} />
                      <BadgeStat label="Resources" value={String(pending.resources)} />
                      <BadgeStat label="Family" value={String(pending.family)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={syncAll}>
                        <Wifi className="h-4 w-4" /> {t("syncStatus")}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/">Dashboard</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80 p-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Globe2 className="h-4 w-4" />
                  <div>
                    <p className="font-semibold text-foreground">{t("lowDataMode")}</p>
                    <p>{t("lowDataHint")}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Tabs defaultValue="alerts">
              <TabsList className="grid grid-cols-5 gap-1 rounded-full bg-muted p-1 text-xs text-muted-foreground">
                <TabsTrigger value="alerts">{t("alertsTab")}</TabsTrigger>
                <TabsTrigger value="reports">{t("reportsTab")}</TabsTrigger>
                <TabsTrigger value="watch">{t("watchTab")}</TabsTrigger>
                <TabsTrigger value="resources">{t("resourcesTab")}</TabsTrigger>
                <TabsTrigger value="family">{t("familyTab")}</TabsTrigger>
              </TabsList>

              <TabsContent value="alerts" className="space-y-6 pt-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("sendAlert")}</CardTitle>
                      <CardDescription>{t("lowDataHint")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="alert-title">{t("alertTitle")}</Label>
                        <Input id="alert-title" value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} placeholder={t("communityAlertPlaceholder")} />
                      </div>
                      <div>
                        <Label htmlFor="alert-message">{t("alertMessage")}</Label>
                        <Textarea
                          id="alert-message"
                          rows={4}
                          value={alertMessage}
                          onChange={(event) => setAlertMessage(event.target.value)}
                          placeholder={t("communityAlertMessagePlaceholder")}
                        />
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground">{t("smsPreviewLabel")}</p>
                        <p className="mt-2 whitespace-pre-wrap">{alertPreview}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleSendAlert}>{t("sendNow")}</Button>
                        <Button variant="outline" onClick={() => toast.success(t("alertDelivered"))}>
                          {t("ussdInstruction")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="space-y-4 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-5 w-5 text-success" />
                      <p className="font-semibold text-foreground">{t("alert2GDescription")}</p>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <p>• {t("lowDataHint")}</p>
                      <p>• {t("smsPlainTextHint")}</p>
                      <p>• {t("ussdQuickUpdate")}</p>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("reportIncident")}</CardTitle>
                    <CardDescription>{t("offlineHelp")}</CardDescription>
                  </CardHeader>
                  <CardContent className={`space-y-4 ${compact ? "text-sm" : ""}`}>
                    <div>
                      <Label htmlFor="report-category">{t("reportCategory")}</Label>
                      <select
                        id="report-category"
                        value={report.category}
                        onChange={(event) => setReport((prev) => ({ ...prev, category: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="report-location">{t("reportLocation")}</Label>
                      <Input
                        id="report-location"
                        value={report.location}
                        onChange={(event) => setReport((prev) => ({ ...prev, location: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-details">{t("reportDetails")}</Label>
                      <Textarea
                        id="report-details"
                        rows={3}
                        value={report.details}
                        onChange={(event) => setReport((prev) => ({ ...prev, details: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-phone">{t("reportPhone")}</Label>
                      <Input
                        id="report-phone"
                        value={report.contact_phone}
                        onChange={(event) => setReport((prev) => ({ ...prev, contact_phone: event.target.value }))}
                      />
                    </div>
                    <Button onClick={handleQueueReport}>{t("queueReport")}</Button>
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {reports.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">{t("noRecordsYet")}</Card>
                  ) : (
                    reports.slice(0, 4).map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.category}</p>
                            <p className="text-sm text-muted-foreground">{item.location || "—"}</p>
                          </div>
                          <span className="rounded-full border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground">{item.status}</span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{item.details}</p>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="watch" className="space-y-6 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("groupTitle")}</CardTitle>
                    <CardDescription>{t("watchDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="group-name">{t("groupName")}</Label>
                      <Input id="group-name" value={group.group_name} onChange={(event) => setGroup((prev) => ({ ...prev, group_name: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="group-area">{t("groupArea")}</Label>
                      <Input id="group-area" value={group.area} onChange={(event) => setGroup((prev) => ({ ...prev, area: event.target.value }))} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="group-members">{t("groupMembers")}</Label>
                        <Input
                          id="group-members"
                          type="number"
                          min={1}
                          value={group.members_count}
                          onChange={(event) => setGroup((prev) => ({ ...prev, members_count: Number(event.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="group-phone">{t("groupPhone")}</Label>
                        <Input id="group-phone" value={group.contact_phone} onChange={(event) => setGroup((prev) => ({ ...prev, contact_phone: event.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="group-notes">{t("groupNotes")}</Label>
                      <Textarea id="group-notes" rows={3} value={group.notes} onChange={(event) => setGroup((prev) => ({ ...prev, notes: event.target.value }))} />
                    </div>
                    <Button onClick={handleAddGroup}>{t("addGroup")}</Button>
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {groups.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">{t("noRecordsYet")}</Card>
                  ) : (
                    groups.slice(0, 4).map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.group_name}</p>
                            <p className="text-sm text-muted-foreground">{item.area || "—"}</p>
                          </div>
                          <span className="rounded-full border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground">{item.members_count} members</span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="resources" className="space-y-6 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("resourceTitle")}</CardTitle>
                    <CardDescription>{t("resourceDescriptionCard")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="resource-name">{t("resourceName")}</Label>
                      <Input id="resource-name" value={resource.name} onChange={(event) => setResource((prev) => ({ ...prev, name: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="resource-type">{t("resourceType")}</Label>
                      <select
                        id="resource-type"
                        value={resource.resource_type}
                        onChange={(event) => setResource((prev) => ({ ...prev, resource_type: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {RESOURCE_TYPES.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="resource-address">{t("resourceAddress")}</Label>
                      <Input id="resource-address" value={resource.address} onChange={(event) => setResource((prev) => ({ ...prev, address: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="resource-description">{t("resourceDescription")}</Label>
                      <Textarea id="resource-description" rows={3} value={resource.description} onChange={(event) => setResource((prev) => ({ ...prev, description: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="resource-phone">{t("resourcePhone")}</Label>
                      <Input id="resource-phone" value={resource.contact_phone} onChange={(event) => setResource((prev) => ({ ...prev, contact_phone: event.target.value }))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="resource-safe"
                        type="checkbox"
                        checked={resource.is_safe}
                        onChange={(event) => setResource((prev) => ({ ...prev, is_safe: event.target.checked }))}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <Label htmlFor="resource-safe">{t("resourceSafe")}</Label>
                    </div>
                    <Button onClick={handleAddResource}>{t("addResource")}</Button>
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {resources.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">{t("noRecordsYet")}</Card>
                  ) : (
                    resources.slice(0, 4).map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.resource_type}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] ${item.is_safe ? "border border-success/40 text-success" : "border border-warning/40 text-warning"}`}>
                            {item.is_safe ? t("safeStatus") : t("checkStatus")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.address || item.description || "—"}</p>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="family" className="space-y-6 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("familyTitle")}</CardTitle>
                    <CardDescription>{t("familyDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="family-name">{t("familyName")}</Label>
                      <Input id="family-name" value={family.name} onChange={(event) => setFamily((prev) => ({ ...prev, name: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="family-relation">{t("relation")}</Label>
                      <Input id="family-relation" value={family.relation} onChange={(event) => setFamily((prev) => ({ ...prev, relation: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="family-last-seen">{t("lastSeen")}</Label>
                      <Input id="family-last-seen" value={family.last_seen_location} onChange={(event) => setFamily((prev) => ({ ...prev, last_seen_location: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="family-last-seen-date">{t("lastSeenDate")}</Label>
                      <Input id="family-last-seen-date" type="date" value={family.last_seen_date} onChange={(event) => setFamily((prev) => ({ ...prev, last_seen_date: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="family-contact">{t("familyContact")}</Label>
                      <Input id="family-contact" value={family.contact_phone} onChange={(event) => setFamily((prev) => ({ ...prev, contact_phone: event.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="family-status">{t("familyStatus")}</Label>
                      <select
                        id="family-status"
                        value={family.status}
                        onChange={(event) => setFamily((prev) => ({ ...prev, status: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="missing">Missing</option>
                        <option value="found">Found</option>
                        <option value="reunited">Reunited</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="family-notes">{t("familyNotes")}</Label>
                      <Textarea id="family-notes" rows={3} value={family.notes} onChange={(event) => setFamily((prev) => ({ ...prev, notes: event.target.value }))} />
                    </div>
                    <Button onClick={handleAddFamily}>{t("addFamily")}</Button>
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {families.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">{t("noRecordsYet")}</Card>
                  ) : (
                    families.slice(0, 4).map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.relation || "—"} • {item.status}</p>
                          </div>
                          <HeartHandshake className="h-5 w-5 text-primary" />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.last_seen_location || item.contact_phone || "—"}</p>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-4">
            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">{t("operationsTitle")}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• {t("operationsOfflineSupport")}</p>
                <p>• {t("operationsAutoSync")}</p>
                <p>• {t("operationsLowData")}</p>
                <p>• {t("operationsLocalLanguage")}</p>
              </div>
            </Card>
            <Card className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">{t("quickGuideTitle")}</p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>{t("quickGuideLine1")}</p>
                <p>{t("quickGuideLine2")}</p>
                <p>{t("quickGuideLine3")}</p>
                <p>{t("quickGuideLine4")}</p>
              </div>
            </Card>
            <Card className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">{t("nextStepsTitle")}</p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>{t("nextStepsLine1")}</p>
                <p>{t("nextStepsLine2")}</p>
                <p>{t("nextStepsLine3")}</p>
                <p>{t("nextStepsLine4")}</p>
              </div>
            </Card>
          </aside>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function BadgeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border px-3 py-2 text-sm text-muted-foreground">
      <div className="font-semibold text-foreground">{value}</div>
      <div>{label}</div>
    </div>
  );
}
