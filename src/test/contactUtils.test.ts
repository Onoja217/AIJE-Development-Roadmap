import { describe, expect, it, vi } from "vitest";
import {
  createContact,
  searchContacts,
  sortContacts,
  updateContact,
} from "@/utils/contactUtils";
import type { EmergencyContact } from "@/types/contact";

const contacts = [
  {
    id: "2",
    fullName: "Zainab Clinic",
    phoneNumber: "+234800000002",
    role: "hospital",
    community: "Otukpo",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "1",
    fullName: "Ada Police",
    phoneNumber: "+234800000001",
    role: "police",
    community: "Makurdi",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
] satisfies EmergencyContact[];

describe("contact utilities", () => {
  it("creates and updates contacts with timestamps", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
    const input = {
      fullName: "Responder",
      phoneNumber: "+234800000003",
      role: "vigilante" as const,
      community: "Apa",
      status: "active" as const,
    };
    const created = createContact(input);
    expect(created).toMatchObject({
      ...input,
      id: "00000000-0000-4000-8000-000000000001",
    });
    expect(
      updateContact(created, { ...input, status: "inactive" }).status,
    ).toBe("inactive");
  });

  it("sorts a copy alphabetically and searches all visible fields", () => {
    expect(sortContacts(contacts).map((contact) => contact.id)).toEqual([
      "1",
      "2",
    ]);
    expect(contacts[0].id).toBe("2");
    expect(searchContacts(contacts, "makurdi")).toEqual([contacts[1]]);
    expect(searchContacts(contacts, "  ")).toBe(contacts);
  });
});
