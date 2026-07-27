// components/ContactForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactSchemaType } from "../lib/contactSchema";
import { CONTACT_ROLES, ROLE_CONFIG } from "../config/contactConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmergencyContact, EmergencyContactInput } from "../types/contact";

interface ContactFormProps {
  initialValues?: EmergencyContact;
  onSubmit: (values: EmergencyContactInput) => void;
  onCancel: () => void;
}

export function ContactForm({ initialValues, onSubmit, onCancel }: ContactFormProps) {
  const form = useForm<ContactSchemaType>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: initialValues?.fullName ?? "",
      phoneNumber: initialValues?.phoneNumber ?? "",
      role: initialValues?.role,
      community: initialValues?.community ?? "",
      status: initialValues?.status ?? "active",
    },
  });

  function handleSubmit(values: ContactSchemaType) {
    onSubmit(values as EmergencyContactInput);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Sgt. Aondona Iyorpuu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="080…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONTACT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_CONFIG[role].icon} {ROLE_CONFIG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="community"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Community</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Otukpo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialValues ? "Save Changes" : "Add Contact"}</Button>
        </div>
      </form>
    </Form>
  );
}