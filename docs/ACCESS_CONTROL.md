# AIJE access-control architecture

AIJE treats a user as an identity. Access is granted through membership in an
organization and is constrained by permissions and resource scope.

## Authorization chain

```text
Authenticated user
  -> active organization membership
  -> one or more roles
  -> role permissions
  -> organization/site/team resource scope
```

The frontend uses this chain to present relevant navigation. Supabase Row Level
Security and Edge Functions remain authoritative for every read and mutation.

## Organization roles

| Role               | Intended responsibility                          |
| ------------------ | ------------------------------------------------ |
| Resident           | Personal safety and incident reporting           |
| Household Owner    | Household members and home security              |
| Security Operator  | Assigned cameras, alerts and response operations |
| Community Leader   | Community Watch and alert coordination           |
| Responder          | Assigned incident response                       |
| Moderator          | Report verification and resource moderation      |
| Organization Admin | Members, roles, sites, billing and policies      |
| Platform Admin     | Cross-organization platform administration       |

Roles are permission bundles. Application code must check permissions rather
than hard-coding role names unless a workflow is specifically about assigning a
role.

## Tenant migration strategy

Existing users receive a personal organization with Resident and Organization
Admin roles. Existing owner policies remain active while operational records
are backfilled with `organization_id`. New shared workflows should always set
`organization_id`, and site-owned equipment should additionally set `site_id`.

Once all production records have a tenant and all clients use scoped writes,
the compatibility owner policies can be removed in a separate audited
migration.

## Security rules

- Never authorize using role or organization data supplied by the browser.
- Use `current_user_has_permission(organization_id, permission)` inside RLS.
- Platform roles cannot be assigned through organization administration.
- The last organization administrator cannot be demoted.
- Invitations are email-bound, expire after seven days, and activate when the
  matching authenticated user signs in.
- Membership, invitation and role changes must write immutable audit events.
- Anonymous incident reports go through the rate-limited Edge Function; anon
  never receives direct insert privileges on `incident_reports`.

## Adding a protected feature

1. Add or reuse a permission in `access_permissions`.
2. Assign it to the appropriate system roles.
3. Add organization/site scope to the data model.
4. Create RLS policies using permission helpers.
5. Protect the route with `PermissionRoute`.
6. Hide navigation using `hasPermission`.
7. Add tests proving access is not inherited across organizations.
