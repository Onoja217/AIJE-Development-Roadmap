-- Every organization needs at least one assignable team. Previously the
-- incident assignment UI could only read teams, while no application flow
-- created them, leaving the selector permanently empty.

INSERT INTO public.teams (organization_id, name, team_type)
SELECT organization.id, 'General Response Team', 'response'
FROM public.organizations organization
WHERE NOT EXISTS (
  SELECT 1
  FROM public.teams team
  WHERE team.organization_id = organization.id
);

CREATE OR REPLACE FUNCTION public.create_default_response_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.teams (organization_id, name, team_type)
  VALUES (NEW.id, 'General Response Team', 'response');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS create_default_response_team ON public.organizations;
CREATE TRIGGER create_default_response_team
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_default_response_team();

REVOKE ALL ON FUNCTION public.create_default_response_team() FROM PUBLIC;
