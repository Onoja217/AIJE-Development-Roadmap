import { z } from "zod";

export const CONTACT_ROLE_VALUES = [
  "police",
  "hospital",
  "fire_service",
  "community_leader",
  "vigilante",
  "ngo",
  "family",
] as const;

export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(100, "Name is too long"),

  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .regex(
      /^\+?[0-9\s()-]{7,20}$/,
      "Enter a valid phone number"
    ),

  role: z.enum(CONTACT_ROLE_VALUES, {
    required_error: "Select a role",
  }),

  community: z
    .string()
    .trim()
    .min(2, "Community is required")
    .max(100, "Community name is too long"),

  status: z.enum(["active", "inactive"], {
    required_error: "Select a status",
  }),
});

export type ContactSchemaType = z.infer<typeof contactSchema>;