import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  MapPin,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { RoleResourceLinks } from "@/features/access/RoleResourceLinks";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useAccess } from "@/features/access/AccessProvider";
import {
  createOrganization,
  createSite,
  fetchOrganizationInvitations,
  fetchOrganizationMembers,
  fetchOrganizationSites,
  inviteMember,
  setMemberRoles,
} from "@/features/access/accessApi";
import {
  ORGANIZATION_ROLES,
  type OrganizationInvitation,
  type OrganizationKind,
  type OrganizationMember,
  type OrganizationRole,
  type OrganizationSite,
} from "@/features/access/types";

const ROLE_LABELS: Record<OrganizationRole, string> = {
  resident: "Resident",
  household_owner: "Household Owner",
  security_operator: "Security Operator",
  community_leader: "Community Leader",
  responder: "Responder",
  moderator: "Moderator",
  organization_admin: "Organization Admin",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OrganizationAdmin() {
  const {
    activeOrganization,
    hasPermission,
    refresh: refreshAccess,
    setActiveOrganizationId,
  } = useAccess();
  const { toast } = useToast();
  const [sites, setSites] = useState<OrganizationSite[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationKind, setOrganizationKind] =
    useState<OrganizationKind>("business");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("resident");

  const canManageSites = hasPermission("sites.manage");
  const canInvite = hasPermission("members.invite");
  const canAssignRoles = hasPermission("members.assign_roles");

  const refreshOrganization = useCallback(async () => {
    if (!activeOrganization) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [nextSites, nextMembers, nextInvitations] = await Promise.all([
        fetchOrganizationSites(activeOrganization.id),
        fetchOrganizationMembers(activeOrganization.id),
        canInvite
          ? fetchOrganizationInvitations(activeOrganization.id)
          : Promise.resolve([]),
      ]);
      setSites(nextSites);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
    } catch (error) {
      toast({
        title: "Organization data unavailable",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeOrganization, canInvite, toast]);

  useEffect(() => {
    void refreshOrganization();
  }, [refreshOrganization]);

  async function handleCreateOrganization(event: FormEvent) {
    event.preventDefault();
    const slug = slugify(organizationName);
    if (organizationName.trim().length < 2 || !slug) return;

    setSubmitting("organization");
    try {
      const organizationId = await createOrganization({
        name: organizationName.trim(),
        slug: `${slug}-${crypto.randomUUID().slice(0, 6)}`,
        kind: organizationKind,
      });
      await refreshAccess();
      setActiveOrganizationId(organizationId);
      setOrganizationName("");
      toast({ title: "Organization created" });
    } catch (error) {
      toast({
        title: "Could not create organization",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCreateSite(event: FormEvent) {
    event.preventDefault();
    if (!activeOrganization || siteName.trim().length < 2) return;

    setSubmitting("site");
    try {
      await createSite({
        organizationId: activeOrganization.id,
        name: siteName.trim(),
        address: siteAddress.trim(),
      });
      setSiteName("");
      setSiteAddress("");
      await refreshOrganization();
      toast({ title: "Site added" });
    } catch (error) {
      toast({
        title: "Could not add site",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!activeOrganization || !inviteEmail.includes("@")) return;

    setSubmitting("invite");
    try {
      await inviteMember({
        organizationId: activeOrganization.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      await refreshOrganization();
      toast({
        title: "Invitation created",
        description:
          "The membership activates automatically when this email signs in.",
      });
    } catch (error) {
      toast({
        title: "Could not create invitation",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleRoleChange(
    membershipId: string,
    role: OrganizationRole,
  ) {
    if (!activeOrganization) return;
    setSubmitting(`role-${membershipId}`);
    try {
      await setMemberRoles({
        organizationId: activeOrganization.id,
        membershipId,
        roles: [role],
      });
      await Promise.all([refreshOrganization(), refreshAccess()]);
      toast({ title: "Member role updated" });
    } catch (error) {
      toast({
        title: "Could not update role",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <RoleResourceLinks />
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Organization Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {activeOrganization?.name ?? "Your organizations"}
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Manage operational sites, team access and role-scoped invitations.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Active members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sites.length}</p>
                <p className="text-sm text-muted-foreground">
                  Operational sites
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <UserPlus className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{invitations.length}</p>
                <p className="text-sm text-muted-foreground">
                  Pending invitations
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" /> Create organization
              </CardTitle>
              <CardDescription>
                Create a separate tenant for a household, community, company or
                agency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateOrganization}>
                <div className="space-y-2">
                  <Label htmlFor="organization-name">Name</Label>
                  <Input
                    id="organization-name"
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(event.target.value)
                    }
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={organizationKind}
                    onValueChange={(value) =>
                      setOrganizationKind(value as OrganizationKind)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["household", "community", "business", "government"].map(
                        (kind) => (
                          <SelectItem key={kind} value={kind}>
                            {kind[0].toUpperCase() + kind.slice(1)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={submitting === "organization"} type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Create organization
                </Button>
              </form>
            </CardContent>
          </Card>

          {canInvite ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5" /> Invite member
                </CardTitle>
                <CardDescription>
                  Assign a scoped role before the member joins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleInvite}>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) =>
                        setInviteRole(value as OrganizationRole)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORGANIZATION_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button disabled={submitting === "invite"} type="submit">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create invitation
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canManageSites ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" /> Add site
                </CardTitle>
                <CardDescription>
                  Sites scope cameras, sensors and operator access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateSite}>
                  <div className="space-y-2">
                    <Label htmlFor="site-name">Site name</Label>
                    <Input
                      id="site-name"
                      value={siteName}
                      onChange={(event) => setSiteName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site-address">Address</Label>
                    <Input
                      id="site-address"
                      value={siteAddress}
                      onChange={(event) => setSiteAddress(event.target.value)}
                    />
                  </div>
                  <Button disabled={submitting === "site"} type="submit">
                    <Plus className="mr-2 h-4 w-4" />
                    Add site
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5" /> Membership and roles
              </CardTitle>
              <CardDescription>
                Access is derived from organization membership and assigned
                roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Loading organization…
                </p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {member.display_name ??
                          `Member ${member.user_id.slice(0, 8)}`}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {member.roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role.split("_").join(" ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canAssignRoles ? (
                        <Select
                          value={member.roles[0] ?? "resident"}
                          onValueChange={(value) =>
                            void handleRoleChange(
                              member.id,
                              value as OrganizationRole,
                            )
                          }
                          disabled={submitting === `role-${member.id}`}
                        >
                          <SelectTrigger className="h-8 w-[11rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORGANIZATION_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Badge
                        variant={
                          member.status === "active" ? "default" : "outline"
                        }
                      >
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
