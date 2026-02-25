// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

const mockSelectWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockInsertReturning = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => mockSelectWhere(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => mockUpdateReturning(),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => mockInsertReturning(),
      }),
    }),
  },
}));

// Mock crypto to keep tests deterministic
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
  maskApiKey: vi.fn((val: string) => `sk-...${val.slice(-4)}`),
}));

import { GET, PUT } from "../route";
import { encrypt } from "@/lib/crypto";

const SETTINGS_ROW = {
  id: 1,
  aiProvider: "anthropic",
  aiModel: "claude-sonnet-4-20250514",
  apiKeyAnthropic: "encrypted:sk-ant-test-key-1234",
  apiKeyOpenai: null,
  apiKeyGoogle: null,
  updatedAt: new Date("2024-01-01"),
  updatedBy: "user_abc",
};

function putRequest(body: unknown) {
  return new Request("http://localhost/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings with masked API keys", async () => {
    await mockClerkUser("user_abc");
    mockSelectWhere.mockResolvedValue([SETTINGS_ROW]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aiProvider).toBe("anthropic");
    expect(body.aiModel).toBe("claude-sonnet-4-20250514");
    expect(body.apiKeyAnthropic).toBe("sk-...1234");
    expect(body.apiKeyOpenai).toBeNull();
  });

  it("returns defaults when no settings saved (first run)", async () => {
    await mockClerkUser("user_abc");
    mockSelectWhere.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aiProvider).toBe("anthropic");
    expect(body.aiModel).toBeNull();
    expect(body.apiKeyAnthropic).toBeNull();
    expect(body.updatedAt).toBeNull();
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves provider selection", async () => {
    await mockClerkUser("user_abc");
    // First select for upsert check
    mockSelectWhere.mockResolvedValueOnce([SETTINGS_ROW]);
    mockUpdateReturning.mockResolvedValue([{ ...SETTINGS_ROW, aiProvider: "openai" }]);

    const res = await PUT(putRequest({ aiProvider: "openai" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aiProvider).toBe("openai");
  });

  it("saves and encrypts API key", async () => {
    await mockClerkUser("user_abc");
    mockSelectWhere.mockResolvedValueOnce([SETTINGS_ROW]);
    mockUpdateReturning.mockResolvedValue([{
      ...SETTINGS_ROW,
      apiKeyAnthropic: "encrypted:sk-ant-new-key-5678",
    }]);

    const res = await PUT(putRequest({ apiKeyAnthropic: "sk-ant-new-key-5678" }));

    expect(res.status).toBe(200);
    expect(encrypt).toHaveBeenCalledWith("sk-ant-new-key-5678");
    const body = await res.json();
    expect(body.apiKeyAnthropic).toBe("sk-...5678");
  });

  it("rejects invalid provider name", async () => {
    await mockClerkUser("user_abc");

    const res = await PUT(putRequest({ aiProvider: "invalid-provider" }));

    expect(res.status).toBe(400);
  });

  it("records updatedBy with current user ID", async () => {
    await mockClerkUser("user_xyz");
    mockSelectWhere.mockResolvedValueOnce([SETTINGS_ROW]);
    mockUpdateReturning.mockResolvedValue([{ ...SETTINGS_ROW, updatedBy: "user_xyz" }]);

    const res = await PUT(putRequest({ aiProvider: "anthropic" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updatedBy).toBe("user_xyz");
  });

  it("inserts settings on first save (upsert)", async () => {
    await mockClerkUser("user_abc");
    mockSelectWhere.mockResolvedValueOnce([]); // No existing row
    mockInsertReturning.mockResolvedValue([{ ...SETTINGS_ROW, aiProvider: "google" }]);

    const res = await PUT(putRequest({ aiProvider: "google" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aiProvider).toBe("google");
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await PUT(putRequest({ aiProvider: "anthropic" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    await mockClerkUser("user_abc");
    const req = new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
