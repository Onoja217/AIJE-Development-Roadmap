import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type {
  EmergencyContact,
  EmergencyContactInput,
} from "../../types/contact";

import {
  contactSchema,
  type ContactSchemaType,
} from "../../lib/contactSchema";

import {
  CONTACT_ROLES,
  ROLE_CONFIG,
  STATUS_CONFIG,
} from "../../config/contactConfig";

import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ContactFormProps {
  contact?: EmergencyContact | null;
  onSubmit: (data: EmergencyContactInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const DEFAULT_VALUES: ContactSchemaType = {
  fullName: "",
  phoneNumber: "",
  role: "police",
  community: "",
  status: "active",
};

export function ContactForm({
  contact,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ContactFormProps) {
  const form = useForm<ContactSchemaType>({
    resolver: zodResolver(contactSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        fullName: contact.fullName,
        phoneNumber: contact.phoneNumber,
        role: contact.role,
        community: contact.community,
        status: contact.status,
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [contact, form]);

  function handleSubmit(values: ContactSchemaType) {
    onSubmit(values as EmergencyContactInput);

    if (!contact) {
      form.reset(DEFAULT_VALUES);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        noValidate
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* Contact Name */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter contact or organisation name"
                    autoComplete="name"
                  />
                </FormControl>

                <FormDescription>
                  Name of the responder or organisation.
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone Number */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="tel"
                    placeholder="+234 800 000 0000"
                    autoComplete="tel"
                  />
                </FormControl>

                <FormDescription>
                  Include country code where possible.
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Community */}
          <FormField
            control={form.control}
            name="community"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Community</FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Otukpo, Zone A"
                    autoComplete="address-level2"
                  />
                </FormControl>

                <FormDescription>
                  Area where this contact operates.
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Role */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Role</FormLabel>

                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent>
                    {CONTACT_ROLES.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                      >
                        <span className="flex items-center gap-2">
                          <span>{ROLE_CONFIG[role].icon}</span>
                          <span>{ROLE_CONFIG[role].label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>

                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(
                      ([value, config]) => (
                        <SelectItem
                          key={value}
                          value={value}
                        >
                          {config.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : contact
              ? "Update Contact"
              : "Add Contact"}
          </Button>
        </div>
      </form>
    </Form>
  );
}