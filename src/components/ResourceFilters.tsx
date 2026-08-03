// components/ResourceFilters.tsx
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESOURCE_CATEGORY_CONFIG, RESOURCE_CATEGORIES } from "../config/resourceConfig";
import type { ResourceFilters as ResourceFiltersType } from "../types/resource";

interface ResourceFiltersProps {
  filters: ResourceFiltersType;
  onChange: (filters: ResourceFiltersType) => void;
}

export function ResourceFilters({ filters, onChange }: ResourceFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        placeholder="Search by name or address..."
        value={filters.search ?? ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        className="sm:max-w-xs"
      />

      <Select
        value={filters.category ?? "all"}
        onValueChange={(v) => onChange({ ...filters, category: v === "all" ? undefined : (v as never) })}
      >
        <SelectTrigger className="sm:w-56">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {RESOURCE_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {RESOURCE_CATEGORY_CONFIG[cat].icon} {RESOURCE_CATEGORY_CONFIG[cat].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
