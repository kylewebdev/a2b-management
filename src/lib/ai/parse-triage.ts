import { z } from "zod";
import type { TriageResult } from "./types";

const triageResultSchema = z.object({
  identification: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    period: z.string().nullable().optional(),
    maker: z.string().nullable().optional(),
    materials: z.array(z.string()).nullable().optional(),
  }),
  tier: z.enum(["1", "2", "3", "4"]),
  confidence: z.enum(["low", "medium", "high"]),
  valuation: z.object({
    lowEstimate: z.number(),
    highEstimate: z.number(),
    currency: z.string().default("USD"),
    comparables: z.array(z.string()).nullable().optional(),
  }),
  condition: z.string().nullable().optional(),
  additionalPhotosRequested: z.array(z.string()).nullable().optional(),
  listingGuidance: z
    .object({
      platforms: z.array(z.string()).nullable().optional(),
      keywords: z.array(z.string()).nullable().optional(),
      description: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  sleeperAlert: z.string().nullable().optional(),
});

export interface ParseTriageOutput {
  result: TriageResult | null;
  partial: Partial<TriageResult> | null;
  raw: string;
}

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

function extractTierFromText(text: string): TriageResult["tier"] | null {
  // Look for tier mention: "tier 2", "Tier: 3", "tier: 1", etc.
  const tierMatch = text.match(/tier[:\s]*(\d)/i);
  if (tierMatch) {
    const t = tierMatch[1];
    if (t === "1" || t === "2" || t === "3" || t === "4") return t;
  }
  return null;
}

function extractValuesFromText(text: string): { low: number; high: number } | null {
  // Look for price ranges: "$20-$40", "$20 - $40", "$20–$40", "$20 to $40"
  const rangeMatch = text.match(/\$(\d[\d,]*(?:\.\d{2})?)\s*[-–to]+\s*\$(\d[\d,]*(?:\.\d{2})?)/i);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1].replace(/,/g, ""));
    const high = parseFloat(rangeMatch[2].replace(/,/g, ""));
    if (!isNaN(low) && !isNaN(high)) return { low, high };
  }
  return null;
}

export function parseTriageResult(rawText: string): ParseTriageOutput {
  const cleaned = stripCodeFences(rawText);

  // Try strict JSON parse + Zod validation
  try {
    const parsed = JSON.parse(cleaned);
    const validated = triageResultSchema.safeParse(parsed);
    if (validated.success) {
      return { result: validated.data as TriageResult, partial: null, raw: rawText };
    }
    // JSON parsed but didn't validate — return as partial
    return { result: null, partial: parsed as Partial<TriageResult>, raw: rawText };
  } catch {
    // JSON parse failed — try regex extraction
  }

  // Fallback: regex extraction for tier and values
  const tier = extractTierFromText(rawText);
  const values = extractValuesFromText(rawText);

  if (tier || values) {
    const partial: Partial<TriageResult> = {};
    if (tier) partial.tier = tier;
    if (values) {
      partial.valuation = {
        lowEstimate: values.low,
        highEstimate: values.high,
        currency: "USD",
      };
    }
    return { result: null, partial, raw: rawText };
  }

  return { result: null, partial: null, raw: rawText };
}
