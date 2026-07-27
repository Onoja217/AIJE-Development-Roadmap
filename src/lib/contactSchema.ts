// lib/contactSchema.ts
import { z } from "zod";
import { CONTACT_ROLES } from "../config/contactConfig";

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100, "Name is too long"),

  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .regex(/^[0-9+\s-]{7,15}$/, "Enter a valid phone number"),

  role: z.enum(CONTACT_ROLES as [string, ...string[]], {
    required_error: "Select a role",
  }),

  community: z.string().trim().min(2, "Community is required").max(100, "Too long"),

  status: z.enum(["active", "inactive"], { required_error: "Select a status" }),
});

export type ContactSchemaType = z.infer<typeof contactSchema>;