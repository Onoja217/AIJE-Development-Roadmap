// components/ContactTable.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_CONFIG, STATUS_CONFIG } from "../config/contactConfig";
import type { EmergencyContact } from "../types/contact";

interface ContactTableProps {
  contacts: EmergencyContact[];
  onEdit: (contact: EmergencyContact) => void;
  onDelete: (contact: EmergencyContact) => void;
}

export function ContactTable({ contacts, onEdit, onDelete }: ContactTableProps) {
  if (contacts.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No contacts found.</p>;
  }

  return (
    <>
      {/* Table layout for larger screens */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Community</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.fullName}</td>
                <td className="p-3">
                  <a href={`tel:${c.phoneNumber}`} className="text-primary underline">
                    {c.phoneNumber}
                  </a>
                </td>
                <td className="p-3">
                  {ROLE_CONFIG[c.role].icon} {ROLE_CONFIG[c.role].label}
                </td>
                <td className="p-3">{c.community}</td>
                <td className="p-3">
                  <Badge className={`${STATUS_CONFIG[c.status].color} text-white`}>
                    {STATUS_CONFIG[c.status].label}
                  </Badge>
                </td>
                <td className="p-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(c)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(c)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card layout for mobile */}
      <div className="sm:hidden space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="border rounded-md p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{c.fullName}</p>
                <a href={`tel:${c.phoneNumber}`} className="text-xs text-primary underline">
                  {c.phoneNumber}
                </a>
              </div>
              <Badge className={`${STATUS_CONFIG[c.status].color} text-white text-[10px]`}>
                {STATUS_CONFIG[c.status].label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {ROLE_CONFIG[c.role].icon} {ROLE_CONFIG[c.role].label} · {c.community}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(c)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => onDelete(c)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}