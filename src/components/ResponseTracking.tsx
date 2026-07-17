// components/ResponseTracking.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Incident, IncidentStatus } from "../types/incident";

interface ResponseTrackingProps {
  incident: Incident;
  onUpdateStatus: (id: string, status: IncidentStatus, note?: string) => void;
  onAssignResponder: (id: string, responder: string) => void;
}

const NEXT_STATUS: Record<IncidentStatus, IncidentStatus | null> = {
  pending: "verified",
  verified: "responding",
  responding: "resolved",
  resolved: null,
};

const NEXT_STATUS_LABEL: Record<IncidentStatus, string> = {
  pending: "Mark Verified",
  verified: "Mark Responding",
  responding: "Mark Resolved",
  resolved: "Resolved",
};

export function ResponseTracking({ incident, onUpdateStatus, onAssignResponder }: ResponseTrackingProps) {
  const [responder, setResponder] = useState(incident.assignedResponder ?? "");
  const [note, setNote] = useState("");

  const nextStatus = NEXT_STATUS[incident.status];

  function handleAssign() {
    if (responder.trim()) onAssignResponder(incident.id, responder.trim());
  }

  function handleAdvanceStatus() {
    if (nextStatus) onUpdateStatus(incident.id, nextStatus, note.trim() || undefined);
    setNote("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="responder">Assigned responder / team</Label>
        <div className="flex gap-2">
          <Input
            id="responder"
            value={responder}
            onChange={(e) => setResponder(e.target.value)}
            placeholder="e.g. Vigilante Team Alpha"
          />
          <Button variant="outline" onClick={handleAssign}>Assign</Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Response note</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about the response (optional)"
          rows={2}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleAdvanceStatus}
        disabled={!nextStatus}
      >
        {NEXT_STATUS_LABEL[incident.status]}
      </Button>

      {incident.responseNotes && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <span className="font-medium">Latest note: </span>
          {incident.responseNotes}
        </div>
      )}
    </div>
  );
}
