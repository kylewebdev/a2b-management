// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContentStream = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenAI {
    getGenerativeModel() {
      return {
        generateContentStream: mockGenerateContentStream,
      };
    }
  },
}));

import { GoogleProvider } from "../google";
import type { TriageRequest } from "../../types";

const TEST_REQUEST: TriageRequest = {
  photos: [{ base64: "dGVzdA==", mimeType: "image/jpeg" }],
  estateContext: { address: "123 Main St" },
};

describe("GoogleProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates provider with correct name and default model", () => {
    const provider = new GoogleProvider("key-test");
    expect(provider.name).toBe("google");
    expect(provider.model).toBe("gemini-2.0-flash");
  });

  it("accepts custom model", () => {
    const provider = new GoogleProvider("key-test", "gemini-2.0-pro");
    expect(provider.model).toBe("gemini-2.0-pro");
  });

  it("streams response chunks", async () => {
    const streamChunks = [
      { text: () => '{"tier":' },
      { text: () => '"3"}' },
    ];

    mockGenerateContentStream.mockResolvedValue({
      stream: {
        [Symbol.asyncIterator]: () => ({
          next: vi.fn()
            .mockResolvedValueOnce({ value: streamChunks[0], done: false })
            .mockResolvedValueOnce({ value: streamChunks[1], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
      response: Promise.resolve({
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 75,
          totalTokenCount: 225,
        },
      }),
    });

    const provider = new GoogleProvider("key-test");
    const result: string[] = [];

    for await (const chunk of provider.triage(TEST_REQUEST)) {
      result.push(chunk);
    }

    expect(result).toEqual(['{"tier":', '"3"}']);
  });

  it("reports token usage after streaming", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: {
        [Symbol.asyncIterator]: () => ({
          next: vi.fn().mockResolvedValueOnce({ done: true }),
        }),
      },
      response: Promise.resolve({
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 100,
          totalTokenCount: 300,
        },
      }),
    });

    const provider = new GoogleProvider("key-test");
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
    const provider = new GoogleProvider("key-test");
    expect(provider.getUsage()).toBeNull();
  });

  it("handles API errors", async () => {
    mockGenerateContentStream.mockRejectedValue(new Error("API key invalid"));

    const provider = new GoogleProvider("key-bad");

    await expect(async () => {
      for await (const _ of provider.triage(TEST_REQUEST)) {
        // consume
      }
    }).rejects.toThrow("API key invalid");
  });
});
