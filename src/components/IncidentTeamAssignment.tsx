import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useAccess } from "@/features/access/AccessProvider";
import {
  assignIncidentTeam,
  fetchResponseTeams,
  type ResponseTeam,
} from "@/services/incidentOperations";
import type { Incident } from "@/types/incident";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function IncidentTeamAssignment({
  incident,
  onSaved,
}: {
  incident: Incident;
  onSaved: () => Promise<void>;
}) {
  const { activeOrganization, hasPermission } = useAccess();
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamId, setTeamId] = useState(incident.assignedTeamId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTeamId(incident.assignedTeamId ?? "");
  }, [incident.assignedTeamId]);

  useEffect(() => {
    if (!activeOrganization || !hasPermission("incidents.assign")) return;
    setLoadingTeams(true);
    setMessage(null);
    void fetchResponseTeams(activeOrganization.id)
      .then((responseTeams) => {
        setTeams(responseTeams);
        if (responseTeams.length === 0) {
          setMessage(
            "No response teams are available for this organization yet.",
          );
        }
      })
      .catch(() => setMessage("Response teams could not be loaded."))
      .finally(() => setLoadingTeams(false));
  }, [activeOrganization, hasPermission]);

  if (incident.origin !== "database" || !hasPermission("incidents.assign"))
    return null;

  const save = async () => {
    if (!teamId) return;
    setSaving(true);
    setMessage(null);
    try {
      await assignIncidentTeam({ incidentId: incident.id, teamId });
      await onSaved();
      setMessage("Team assignment persisted in audit history.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Team assignment failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="space-y-2 rounded-lg border p-3"
      aria-label="Response team assignment"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4" /> Assigned response team
      </p>
      <div className="flex gap-2">
        <Select
          value={teamId}
          onValueChange={setTeamId}
          disabled={loadingTeams || teams.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                loadingTeams
                  ? "Loading teams…"
                  : teams.length === 0
                    ? "No teams available"
                    : "Select a team"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} · {team.teamType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => void save()}
          disabled={!teamId || saving || loadingTeams}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
        </Button>
      </div>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
