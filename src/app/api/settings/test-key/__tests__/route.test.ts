// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// Shared mock fns that tests can configure
const mockAnthropicCreate = vi.fn().mockResolvedValue({ id: "msg_123" });
const mockOpenAICreate = vi.fn().mockResolvedValue({ id: "chatcmpl-123" });
const mockGoogleGenerate = vi.fn().mockResolvedValue({ response: { text: () => "ok" } });

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockAnthropicCreate };
  },
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockOpenAICreate } };
  },
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleAI {
    getGenerativeModel() {
      return { generateContent: mockGoogleGenerate };
    }
  },
}));

describe("POST /api/settings/test-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnthropicCreate.mockResolvedValue({ id: "msg_123" });
    mockOpenAICreate.mockResolvedValue({ id: "chatcmpl-123" });
    mockGoogleGenerate.mockResolvedValue({ response: { text: () => "ok" } });
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", apiKey: "sk-test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing provider", async () => {
    await mockClerkUser("user_test123");

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "sk-test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing apiKey", async () => {
    await mockClerkUser("user_test123");

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns valid:true for successful Anthropic key test", async () => {
    await mockClerkUser("user_test123");

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", apiKey: "sk-ant-test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 1 })
    );
  });

  it("returns valid:false with error for failed Anthropic key", async () => {
    await mockClerkUser("user_test123");
    mockAnthropicCreate.mockRejectedValue(new Error("Invalid API key"));

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", apiKey: "bad-key" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe("Invalid API key");
  });

  it("returns valid:true for successful OpenAI key test", async () => {
    await mockClerkUser("user_test123");

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: "sk-test" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 1 })
    );
  });

  it("returns valid:true for successful Google key test", async () => {
    await mockClerkUser("user_test123");

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", apiKey: "AIza-test" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(mockGoogleGenerate).toHaveBeenCalledWith("Hi");
  });
});
