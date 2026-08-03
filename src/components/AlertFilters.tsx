// components/AlertFilters.tsx
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "../config/dashboardConfig";
import type { IncidentFilters } from "../types/incident";

interface AlertFiltersProps {
  filters: IncidentFilters;
  onChange: (filters: IncidentFilters) => void;
}

export function AlertFilters({ filters, onChange }: AlertFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        placeholder="Search incidents..."
        value={filters.search ?? ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        className="sm:max-w-xs"
      />

      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) => onChange({ ...filters, status: v === "all" ? undefined : (v as never) })}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? "all"}
        onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? undefined : (v as never) })}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
