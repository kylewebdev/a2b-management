import { z } from "zod";

export const updateSettingsSchema = z.object({
  aiProvider: z.enum(["anthropic", "openai", "google"]).optional(),
  aiModel: z.string().trim().nullable().optional(),
  apiKeyAnthropic: z.string().trim().nullable().optional(),
  apiKeyOpenai: z.string().trim().nullable().optional(),
  apiKeyGoogle: z.string().trim().nullable().optional(),
  costWarningThreshold: z.number().int().min(1).nullable().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
