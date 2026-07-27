import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";

import type {
  EmergencyContact,
  EmergencyContactInput,
} from "../types/contact";

import { useContacts } from "../hooks/useContacts";
import { ContactForm } from "../components/contacts/ContactForm";
import { ContactTable } from "../components/contacts/ContactTable";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function EmergencyContactsPage() {
  const {
    contacts,
    filteredContacts,
    searchQuery,
    setSearchQuery,
    addContact,
    editContact,
    deleteContact,
  } = useContacts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<EmergencyContact | null>(null);

  const activeContacts = useMemo(
    () =>
      contacts.filter(
        (contact) => contact.status === "active"
      ).length,
    [contacts]
  );

  function openCreateForm() {
    setSelectedContact(null);
    setIsFormOpen(true);
  }

  function openEditForm(contact: EmergencyContact) {
    setSelectedContact(contact);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setSelectedContact(null);
  }

  function handleSubmit(data: EmergencyContactInput) {
    if (selectedContact) {
      editContact(selectedContact.id, data);
    } else {
      addContact(data);
    }

    closeForm();
  }

  function handleDelete(contact: EmergencyContact) {
    const confirmed = window.confirm(
      `Delete ${contact.fullName} from emergency contacts?`
    );

    if (!confirmed) {
      return;
    }

    deleteContact(contact.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="size-6 text-primary"
              aria-hidden="true"
            />

            <h1 className="text-2xl font-bold tracking-tight">
              Emergency Contacts
            </h1>
          </div>

          <p className="mt-1 text-muted-foreground">
            Manage trusted responders, emergency services and
            community support contacts.
          </p>
        </div>

        <Button type="button" onClick={openCreateForm}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add Contact
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total contacts</CardDescription>
            <CardTitle className="text-3xl">
              {contacts.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active contacts</CardDescription>
            <CardTitle className="text-3xl">
              {activeContacts}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Directory</CardTitle>
          <CardDescription>
            Search, update and remove emergency contacts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ContactTable
            contacts={filteredContacts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          } else {
            setIsFormOpen(true);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedContact
                ? "Edit Emergency Contact"
                : "Add Emergency Contact"}
            </DialogTitle>

            <DialogDescription>
              {selectedContact
                ? "Update the responder’s contact information."
                : "Add a trusted responder or emergency service to the directory."}
            </DialogDescription>
          </DialogHeader>

          <ContactForm
            contact={selectedContact}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}