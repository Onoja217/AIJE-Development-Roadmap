// components/ResourceList.tsx
import { ResourceCard } from "./ResourceCard";
import type { EmergencyResource } from "../types/resource";

interface ResourceListProps {
  resources: Array<EmergencyResource & { distanceKm?: number }>;
  selectedId?: string;
  onSelect: (resource: EmergencyResource) => void;
}

export function ResourceList({ resources, selectedId, onSelect }: ResourceListProps) {
  if (resources.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No resources match your search.</p>;
  }

  return (
    <div className="space-y-2">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} selected={selectedId === r.id} onSelect={onSelect} />
      ))}
    </div>
  );
}
