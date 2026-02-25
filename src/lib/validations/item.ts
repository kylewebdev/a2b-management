import { z } from "zod";

export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 1;
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const updateItemSchema = z.object({
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
  disposition: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
