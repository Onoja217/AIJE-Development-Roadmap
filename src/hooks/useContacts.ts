// hooks/useContacts.ts
//
// Mock data + in-memory CRUD so this page is fully usable before backend
// integration exists. Swap the internals here for real API calls later —
// every component consuming this hook stays unchanged.
//
// NOTE: This does NOT touch alert dispatch logic — it only manages the
// contact records themselves, per the issue's "do not modify" instruction.

import { useState, useEffect, useCallback } from "react";
import type { EmergencyContact, EmergencyContactInput } from "../types/contact";

const MOCK_CONTACTS: EmergencyContact[] = [
  { id: "c1", fullName: "Sgt. Aondona Iyorpuu", phoneNumber: "080-100-0001", role: "police", community: "Otukpo", status: "active" },
  { id: "c2", fullName: "Dr. Chinwe Okafor", phoneNumber: "080-100-0002", role: "hospital", community: "Otukpo", status: "active" },
  { id: "c3", fullName: "Adaji Ogbaji", phoneNumber: "080-100-0003", role: "vigilante", community: "Ochekwu", status: "active" },
  { id: "c4", fullName: "Chief Michael Ogah", phoneNumber: "080-100-0004", role: "community_leader", community: "Ochekwu", status: "active" },
  { id: "c5", fullName: "Benue Relief NGO — Coordinator", phoneNumber: "080-100-0005", role: "ngo", community: "Otukpo", status: "inactive" },
];

export function useContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setContacts(MOCK_CONTACTS);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const addContact = useCallback((input: EmergencyContactInput) => {
    const newContact: EmergencyContact = { ...input, id: crypto.randomUUID() };
    setContacts((prev) => [newContact, ...prev]);
    // TODO: replace with a real API call once backend is available.
  }, []);

  const updateContact = useCallback((id: string, input: EmergencyContactInput) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...input, id } : c)));
    // TODO: replace with a real API call once backend is available.
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    // TODO: replace with a real API call once backend is available.
  }, []);

  return { contacts, isLoading, addContact, updateContact, deleteContact };
}