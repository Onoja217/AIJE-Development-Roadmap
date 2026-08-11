import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccess } from "@/features/access/AccessProvider";

export function OrganizationSwitcher() {
  const {
    loading,
    organizations,
    activeOrganization,
    setActiveOrganizationId,
  } = useAccess();

  if (loading || organizations.length === 0) return null;

  return (
    <Select
      value={activeOrganization?.id}
      onValueChange={setActiveOrganizationId}
    >
      <SelectTrigger
        className="h-9 w-[11rem] bg-secondary md:w-[14rem]"
        aria-label="Active organization"
      >
        <Building2 className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
