// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK
const mockStream = {
  [Symbol.asyncIterator]: vi.fn(),
  finalMessage: vi.fn(),
};

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      stream: vi.fn().mockReturnValue(mockStream),
    };
  },
}));

import { AnthropicProvider } from "../anthropic";
import type { TriageRequest } from "../../types";

const TEST_REQUEST: TriageRequest = {
  photos: [{ base64: "dGVzdA==", mimeType: "image/jpeg" }],
  estateContext: { address: "123 Main St" },
};

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates provider with correct name and default model", () => {
    const provider = new AnthropicProvider("sk-test");
    expect(provider.name).toBe("anthropic");
    expect(provider.model).toBe("claude-sonnet-4-20250514");
  });

  it("accepts custom model", () => {
    const provider = new AnthropicProvider("sk-test", "claude-opus-4-20250514");
    expect(provider.model).toBe("claude-opus-4-20250514");
  });

  it("streams response chunks", async () => {
    const chunks = [
      { type: "content_block_delta", delta: { type: "text_delta", text: '{"tier":' } },
      { type: "content_block_delta", delta: { type: "text_delta", text: '"2"}' } },
    ];

    mockStream[Symbol.asyncIterator].mockReturnValue({
      next: vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ done: true }),
    });

    mockStream.finalMessage.mockResolvedValue({
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const provider = new AnthropicProvider("sk-test");
    const result: string[] = [];

    for await (const chunk of provider.triage(TEST_REQUEST)) {
      result.push(chunk);
    }

    expect(result).toEqual(['{"tier":', '"2"}']);
  });

  it("reports token usage after streaming", async () => {
    mockStream[Symbol.asyncIterator].mockReturnValue({
      next: vi.fn().mockResolvedValueOnce({ done: true }),
    });

    mockStream.finalMessage.mockResolvedValue({
      usage: { input_tokens: 200, output_tokens: 100 },
    });

    const provider = new AnthropicProvider("sk-test");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of provider.triage(TEST_REQUEST)) {
      // consume stream
    }

    const usage = provider.getUsage();
    expect(usage).toEqual({
      inputTokens: 200,
      outputTokens: 100,
      totalTokens: 300,
    });
  });

  it("returns null usage before streaming", () => {
    const provider = new AnthropicProvider("sk-test");
    expect(provider.getUsage()).toBeNull();
  });

  it("handles API errors", async () => {
    mockStream[Symbol.asyncIterator].mockReturnValue({
      next: vi.fn().mockRejectedValue(new Error("Invalid API key")),
    });

    const provider = new AnthropicProvider("sk-bad-key");

    await expect(async () => {
      for await (const _ of provider.triage(TEST_REQUEST)) {
        // consume
      }
    }).rejects.toThrow("Invalid API key");
  });
});
