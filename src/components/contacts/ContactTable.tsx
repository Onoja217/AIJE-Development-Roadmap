import { Pencil, Phone, Search, Trash2 } from "lucide-react";

import type { EmergencyContact } from "../../types/contact";

import {
  ROLE_CONFIG,
  STATUS_CONFIG,
} from "../../config/contactConfig";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface ContactTableProps {
  contacts: EmergencyContact[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onEdit: (contact: EmergencyContact) => void;
  onDelete: (contact: EmergencyContact) => void;
}

export function ContactTable({
  contacts,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
}: ContactTableProps) {
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          value={searchQuery}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="Search contacts, communities or roles"
          className="pl-9"
          aria-label="Search emergency contacts"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Community</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No emergency contacts found.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const role = ROLE_CONFIG[contact.role];
                const status = STATUS_CONFIG[contact.status];

                return (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {contact.fullName}
                        </p>

                        <a
                          href={`tel:${contact.phoneNumber}`}
                          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Phone
                            className="size-3.5"
                            aria-hidden="true"
                          />

                          {contact.phoneNumber}
                        </a>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">
                          {role.icon}
                        </span>

                        <span>{role.label}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {contact.community}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          contact.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {status.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(contact)}
                          aria-label={`Edit ${contact.fullName}`}
                        >
                          <Pencil
                            className="size-4"
                            aria-hidden="true"
                          />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(contact)}
                          aria-label={`Delete ${contact.fullName}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2
                            className="size-4"
                            aria-hidden="true"
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}