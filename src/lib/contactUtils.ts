// lib/contactUtils.ts
import type { EmergencyContact } from "../types/contact";

export function searchContacts(contacts: EmergencyContact[], query: string): EmergencyContact[] {
  if (!query.trim()) return contacts;
  const q = query.toLowerCase();
  return contacts.filter((c) =>
    `${c.fullName} ${c.phoneNumber} ${c.community}`.toLowerCase().includes(q)
  );
}