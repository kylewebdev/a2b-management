// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { stream: vi.fn() };
  },
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenAI {
    getGenerativeModel() { return { generateContentStream: vi.fn() }; }
  },
}));

import { getProvider } from "../index";

describe("getProvider", () => {
  it("returns AnthropicProvider for 'anthropic'", () => {
    const provider = getProvider("anthropic", "sk-test");
    expect(provider.name).toBe("anthropic");
    expect(provider.model).toBe("claude-sonnet-4-20250514");
  });

  it("returns OpenAIProvider for 'openai'", () => {
    const provider = getProvider("openai", "sk-test");
    expect(provider.name).toBe("openai");
    expect(provider.model).toBe("gpt-4o");
  });

  it("returns GoogleProvider for 'google'", () => {
    const provider = getProvider("google", "key-test");
    expect(provider.name).toBe("google");
    expect(provider.model).toBe("gemini-2.0-flash");
  });

  it("throws on unknown provider name", () => {
    expect(() => getProvider("claude" as never, "key")).toThrow("Unknown AI provider: claude");
  });

  it("throws on missing API key", () => {
    expect(() => getProvider("anthropic", "")).toThrow("API key is required");
  });
});
