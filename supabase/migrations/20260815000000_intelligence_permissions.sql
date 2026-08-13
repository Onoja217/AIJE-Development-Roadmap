INSERT INTO public.access_permissions (key, description) VALUES
  ('intelligence.view', 'View organization intelligence assessments'),
  ('intelligence.refresh', 'Refresh organization intelligence sources'),
  ('intelligence.export', 'Export organization intelligence'),
  ('intelligence.manage_sources', 'Manage intelligence source configuration')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

WITH grants(role_key, permission_key) AS (VALUES
  ('community_leader', 'intelligence.view'),
  ('community_leader', 'intelligence.refresh'),
  ('community_leader', 'intelligence.export'),
  ('responder', 'intelligence.view'),
  ('moderator', 'intelligence.view'),
  ('moderator', 'intelligence.export'),
  ('organization_admin', 'intelligence.view'),
  ('organization_admin', 'intelligence.refresh'),
  ('organization_admin', 'intelligence.export'),
  ('platform_admin', 'intelligence.view'),
  ('platform_admin', 'intelligence.refresh'),
  ('platform_admin', 'intelligence.export'),
  ('platform_admin', 'intelligence.manage_sources')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM grants
JOIN public.access_roles role ON role.key = grants.role_key
JOIN public.access_permissions permission ON permission.key = grants.permission_key
ON CONFLICT DO NOTHING;
