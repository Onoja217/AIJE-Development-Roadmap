// components/EmergencyContactsPage.tsx
import { useState, useMemo } from "react";
import { useContacts } from "../hooks/useContacts";
import { searchContacts } from "../lib/contactUtils";
import { ContactTable } from "./ContactTable";
import { ContactForm } from "./ContactForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { EmergencyContact, EmergencyContactInput } from "../types/contact";

export function EmergencyContactsPage() {
  const { contacts, isLoading, addContact, updateContact, deleteContact } = useContacts();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<EmergencyContact | null>(null);

  const filtered = useMemo(() => searchContacts(contacts, search), [contacts, search]);

  function openAddForm() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function openEditForm(contact: EmergencyContact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function handleFormSubmit(values: EmergencyContactInput) {
    if (editingContact) {
      updateContact(editingContact.id, values);
    } else {
      addContact(values);
    }
    setFormOpen(false);
    setEditingContact(null);
  }

  function confirmDelete() {
    if (deletingContact) {
      deleteContact(deletingContact.id);
      setDeletingContact(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Emergency Contacts</h1>
        <Button onClick={openAddForm}>+ Add Contact</Button>
      </div>

      <Input
        placeholder="Search by name, phone, or community..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4">Loading contacts…</p>
      ) : (
        <ContactTable contacts={filtered} onEdit={openEditForm} onDelete={setDeletingContact} />
      )}

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <ContactForm
            initialValues={editingContact ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingContact?.fullName} will be permanently removed from the emergency contacts list.
              This does not affect any alerts already sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}