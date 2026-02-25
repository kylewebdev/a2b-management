import { z } from "zod";

export const createEstateSchema = z.object({
  name: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
  address: z.string().trim().min(1, "Address is required"),
  clientName: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
});

const updateFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
  address: z.string().trim().min(1, "Address is required").optional(),
  clientName: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
  status: z.enum(["active", "resolving", "closed"]).optional(),
});

const KNOWN_FIELDS = new Set(["name", "address", "clientName", "notes", "status"]);

/** Parse + validate an update payload. Returns Zod-style result. */
export function parseUpdateEstate(input: unknown) {
  if (typeof input !== "object" || input === null) {
    return { success: false as const, error: { issues: [{ message: "Expected object" }] } };
  }

  const raw = input as Record<string, unknown>;
  const hasKnownField = Object.keys(raw).some((k) => KNOWN_FIELDS.has(k));
  if (!hasKnownField) {
    return { success: false as const, error: { issues: [{ message: "No fields to update" }] } };
  }

  return updateFieldsSchema.safeParse(raw);
}

export type CreateEstateInput = z.infer<typeof createEstateSchema>;
export type UpdateEstateInput = z.infer<typeof updateFieldsSchema>;
