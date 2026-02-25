import type { AIProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { GoogleProvider } from "./providers/google";

export type ProviderName = "anthropic" | "openai" | "google";

export function getProvider(
  name: ProviderName,
  apiKey: string,
  model?: string
): AIProvider {
  if (!apiKey) {
    throw new Error(`API key is required for ${name} provider`);
  }

  switch (name) {
    case "anthropic":
      return new AnthropicProvider(apiKey, model ?? undefined);
    case "openai":
      return new OpenAIProvider(apiKey, model ?? undefined);
    case "google":
      return new GoogleProvider(apiKey, model ?? undefined);
    default:
      throw new Error(`Unknown AI provider: ${name}`);
  }
}

export type { AIProvider, TriageRequest, TriageResult, TriageUsage } from "./types";
