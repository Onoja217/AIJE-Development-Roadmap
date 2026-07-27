import type {
  EmergencyContact,
  EmergencyContactInput,
} from "../types/contact";

export function createContact(
  data: EmergencyContactInput
): EmergencyContact {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateContact(
  existing: EmergencyContact,
  updates: EmergencyContactInput
): EmergencyContact {
  return {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

export function sortContacts(
  contacts: EmergencyContact[]
): EmergencyContact[] {
  return [...contacts].sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );
}

export function searchContacts(
  contacts: EmergencyContact[],
  query: string
): EmergencyContact[] {
  const q = query.trim().toLowerCase();

  if (!q) return contacts;

  return contacts.filter((contact) =>
    [
      contact.fullName,
      contact.phoneNumber,
      contact.community,
      contact.role,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}