-- Tenant-scoped RBAC replaced these legacy global-admin policies. They call
-- public.has_role(), whose execution was intentionally revoked from clients;
-- leaving them installed makes otherwise-authorized incident reads fail.
DROP POLICY IF EXISTS "Admins can view all incident reports"
  ON public.incident_reports;
DROP POLICY IF EXISTS "Admins update incident reports"
  ON public.incident_reports;
DROP POLICY IF EXISTS "Reporters and admins view incident audit"
  ON public.incident_audit_log;
