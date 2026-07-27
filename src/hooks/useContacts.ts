import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  EmergencyContact,
  EmergencyContactInput,
} from "../types/contact";

import {
  createContact,
  searchContacts,
  sortContacts,
  updateContact,
} from "../utils/contactUtils";

const STORAGE_KEY = "aije-emergency-contacts";

function loadStoredContacts(): EmergencyContact[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedContacts =
      window.localStorage.getItem(STORAGE_KEY);

    if (!storedContacts) {
      return [];
    }

    const parsedContacts: unknown =
      JSON.parse(storedContacts);

    if (!Array.isArray(parsedContacts)) {
      return [];
    }

    return parsedContacts as EmergencyContact[];
  } catch {
    return [];
  }
}

export function useContacts() {
  const [contacts, setContacts] = useState<
    EmergencyContact[]
  >(() => loadStoredContacts());

  const [searchQuery, setSearchQuery] =
    useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(contacts)
      );
    } catch {
      console.error(
        "Unable to save emergency contacts."
      );
    }
  }, [contacts]);

  const addContact = useCallback(
    (data: EmergencyContactInput) => {
      const newContact = createContact(data);

      setContacts((currentContacts) =>
        sortContacts([
          ...currentContacts,
          newContact,
        ])
      );

      return newContact;
    },
    []
  );

  const editContact = useCallback(
    (
      contactId: string,
      data: EmergencyContactInput
    ) => {
      setContacts((currentContacts) =>
        sortContacts(
          currentContacts.map((contact) =>
            contact.id === contactId
              ? updateContact(contact, data)
              : contact
          )
        )
      );
    },
    []
  );

  const deleteContact = useCallback(
    (contactId: string) => {
      setContacts((currentContacts) =>
        currentContacts.filter(
          (contact) =>
            contact.id !== contactId
        )
      );
    },
    []
  );

  const getContactById = useCallback(
    (contactId: string) =>
      contacts.find(
        (contact) =>
          contact.id === contactId
      ),
    [contacts]
  );

  const filteredContacts = useMemo(
    () =>
      sortContacts(
        searchContacts(
          contacts,
          searchQuery
        )
      ),
    [contacts, searchQuery]
  );

  return {
    contacts,
    filteredContacts,
    searchQuery,
    setSearchQuery,
    addContact,
    editContact,
    deleteContact,
    getContactById,
  };
}