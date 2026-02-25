// Per-token pricing (rates are per 1M tokens, stored as dollars)
export const PRICING: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4-20250514": { input: 3, output: 15 },
  "anthropic/claude-opus-4-20250514": { input: 15, output: 75 },
  "anthropic/claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4.1": { input: 2, output: 8 },
  "google/gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-2.0-flash-lite": { input: 0.075, output: 0.3 },
};

// Default model per provider (first listed model)
const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: "anthropic/claude-sonnet-4-20250514",
  openai: "openai/gpt-4o",
  google: "google/gemini-2.0-flash",
};

const FALLBACK_KEY = "anthropic/claude-sonnet-4-20250514";

function resolveKey(provider: string, model: string): string {
  const key = `${provider}/${model}`;
  if (PRICING[key]) return key;
  // Fall back to provider default
  if (PROVIDER_DEFAULTS[provider]) return PROVIDER_DEFAULTS[provider];
  // Fall back to absolute default
  return FALLBACK_KEY;
}

/**
 * Calculate cost in dollars from input/output token counts.
 * Rounds to 2 decimal places.
 */
export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  if (inputTokens === 0 && outputTokens === 0) return 0;

  const key = resolveKey(provider, model);
  const rate = PRICING[key];

  const cost =
    (inputTokens * rate.input) / 1_000_000 +
    (outputTokens * rate.output) / 1_000_000;

  return Math.round(cost * 100) / 100;
}

/**
 * Estimate cost from a total token count using an 80/20 input/output ratio.
 * Used for legacy items that only have `tokensUsed` without the split.
 */
export function estimateCostFromTotal(
  provider: string,
  model: string,
  totalTokens: number
): number {
  if (totalTokens === 0) return 0;
  const inputTokens = Math.round(totalTokens * 0.8);
  const outputTokens = totalTokens - inputTokens;
  return calculateCost(provider, model, inputTokens, outputTokens);
}

/**
 * Get display-friendly per-1M-token rates for a provider/model combo.
 */
export function getDisplayRate(
  provider: string,
  model: string
): { inputPer1M: number; outputPer1M: number } {
  const key = resolveKey(provider, model);
  const rate = PRICING[key];
  return { inputPer1M: rate.input, outputPer1M: rate.output };
}
