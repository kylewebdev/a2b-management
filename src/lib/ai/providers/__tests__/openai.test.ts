// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

import { OpenAIProvider } from "../openai";
import type { TriageRequest } from "../../types";

const TEST_REQUEST: TriageRequest = {
  photos: [{ base64: "dGVzdA==", mimeType: "image/jpeg" }],
  estateContext: { address: "123 Main St" },
};

function createMockStream(chunks: unknown[]) {
  return {
    [Symbol.asyncIterator]: () => ({
      next: vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ value: chunks[2], done: false })
        .mockResolvedValueOnce({ done: true }),
    }),
  };
}

describe("OpenAIProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates provider with correct name and default model", () => {
    const provider = new OpenAIProvider("sk-test");
    expect(provider.name).toBe("openai");
    expect(provider.model).toBe("gpt-4o");
  });

  it("accepts custom model", () => {
    const provider = new OpenAIProvider("sk-test", "gpt-4o-mini");
    expect(provider.model).toBe("gpt-4o-mini");
  });

  it("streams response chunks", async () => {
    const chunks = [
      { choices: [{ delta: { content: '{"tier":' } }] },
      { choices: [{ delta: { content: '"2"}' } }] },
      { choices: [{ delta: {} }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } },
    ];

    mockCreate.mockResolvedValue(createMockStream(chunks));

    const provider = new OpenAIProvider("sk-test");
    const result: string[] = [];

    for await (const chunk of provider.triage(TEST_REQUEST)) {
      result.push(chunk);
    }

    expect(result).toEqual(['{"tier":', '"2"}']);
  });

  it("reports token usage from final chunk", async () => {
    const chunks = [
      { choices: [{ delta: { content: "done" } }] },
      { choices: [{ delta: {} }], usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 } },
    ];

    mockCreate.mockResolvedValue({
      [Symbol.asyncIterator]: () => ({
        next: vi.fn()
          .mockResolvedValueOnce({ value: chunks[0], done: false })
          .mockResolvedValueOnce({ value: chunks[1], done: false })
          .mockResolvedValueOnce({ done: true }),
      }),
    });

    const provider = new OpenAIProvider("sk-test");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of provider.triage(TEST_REQUEST)) {
      // consume
    }

    const usage = provider.getUsage();
    expect(usage).toEqual({
      inputTokens: 200,
      outputTokens: 100,
      totalTokens: 300,
    });
  });

  it("returns null usage before streaming", () => {
    const provider = new OpenAIProvider("sk-test");
    expect(provider.getUsage()).toBeNull();
  });

  it("handles API errors", async () => {
    mockCreate.mockRejectedValue(new Error("Invalid API key"));

    const provider = new OpenAIProvider("sk-bad-key");

    await expect(async () => {
      for await (const _ of provider.triage(TEST_REQUEST)) {
        // consume
      }
    }).rejects.toThrow("Invalid API key");
  });
});
