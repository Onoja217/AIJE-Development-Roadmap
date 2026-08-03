import { getErrorMessage } from "@/lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Server, Trash2, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useDeployments } from "@/hooks/useDeployments";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

export default function Deployments() {
  const { deployments, loading, create, remove } = useDeployments();
  const { plan, isActive } = useSubscription();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", description: "" });

  const max = plan?.max_deployments ?? 0;
  const atLimit = isActive ? deployments.length >= max : deployments.length >= 1;
  const blocked = !isActive && deployments.length >= 1;

  const submit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await create(form);
      setForm({ name: "", location: "", description: "" });
      setOpen(false);
      toast.success("Deployment created");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Deployments</span>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-6 space-y-6">
        <Card className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="font-semibold">
              {plan ? plan.name : "No active plan"}
              {isActive && plan && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {deployments.length} / {max} deployments
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/pricing">{isActive ? "Change plan" : "Choose a plan"}</Link>
          </Button>
        </Card>

        {!isActive && (
          <Card className="p-4 border-primary/40 bg-primary/5 flex gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Free trial deployment</div>
              <div className="text-muted-foreground">
                You can create one trial deployment. Subscribe to a plan to unlock more.
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Your sites</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={atLimit}>
                <Plus className="h-4 w-4" /> New deployment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create deployment</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dname">Name</Label>
                  <Input id="dname" placeholder="HQ warehouse"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dloc">Location</Label>
                  <Input id="dloc" placeholder="Lagos, NG"
                    value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ddesc">Notes</Label>
                  <Textarea id="ddesc" rows={3}
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={submitting || !form.name.trim()}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {atLimit && isActive && (
          <p className="text-sm text-muted-foreground">
            You've reached your plan's deployment limit.{" "}
            <Link to="/pricing" className="text-primary underline">Upgrade</Link> to add more.
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : deployments.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No deployments yet. Create your first one to start protecting a site.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {deployments.map((d) => (
              <Card key={d.id} className="p-4 flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{d.name}</h3>
                    <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {d.status}
                    </Badge>
                  </div>
                  {d.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3.5 w-3.5" /> {d.location}
                    </div>
                  )}
                  {d.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (confirm(`Delete deployment "${d.name}"?`)) {
                      try { await remove(d.id); toast.success("Deleted"); }
                      catch (e: unknown) { toast.error(getErrorMessage(e)); }
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
