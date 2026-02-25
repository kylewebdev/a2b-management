// @vitest-environment node
/**
 * Centralized security audit: verifies every API route returns 401 without auth
 * and 403 for wrong-user access patterns.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock DB — returns minimal valid data
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
    update: () => mockUpdate(),
    delete: () => mockDelete(),
  },
}));

// Mock R2
vi.mock("@/lib/r2", () => ({
  uploadFile: vi.fn(),
  generateR2Key: vi.fn().mockReturnValue("test-key"),
  getSignedViewUrl: vi.fn().mockResolvedValue("https://example.com/signed"),
  getFileBuffer: vi.fn().mockResolvedValue(Buffer.from("test")),
  MAX_FILE_SIZE: 15 * 1024 * 1024,
}));

// Mock crypto
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn().mockReturnValue("test-key"),
  encrypt: vi.fn().mockReturnValue("encrypted"),
}));

// Mock AI
vi.mock("@/lib/ai", () => ({
  getProvider: vi.fn(),
}));

// Mock SSE
vi.mock("@/lib/sse", () => ({
  createSSEStream: vi.fn().mockReturnValue({
    stream: new ReadableStream(),
    writer: { send: vi.fn(), sendEvent: vi.fn(), close: vi.fn() },
  }),
  sseResponse: vi.fn().mockReturnValue(new Response()),
}));

// Mock rate limiter
vi.mock("@/lib/triage-rate-limit", () => ({
  triageRateLimiter: { check: vi.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }) },
}));

// Mock pagination
vi.mock("@/lib/pagination", () => ({
  parseCursor: vi.fn().mockReturnValue(null),
  encodeCursor: vi.fn().mockReturnValue("cursor"),
  DEFAULT_PAGE_SIZE: 20,
}));

function chainable(data: unknown[]) {
  const p = Promise.resolve(data);
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    returning: () => p,
    then: (r: (v: unknown) => unknown) => p.then(r),
  };
  return chain;
}

const API_ROUTES = [
  { name: "GET /api/estates", method: "GET", path: "estates" },
  { name: "POST /api/estates", method: "POST", path: "estates" },
  { name: "GET /api/estates/[id]", method: "GET", path: "estates/[id]" },
  { name: "PATCH /api/estates/[id]", method: "PATCH", path: "estates/[id]" },
  { name: "DELETE /api/estates/[id]", method: "DELETE", path: "estates/[id]" },
  { name: "POST /api/estates/[id]/items", method: "POST", path: "estates/[id]/items" },
  { name: "GET /api/estates/[id]/items", method: "GET", path: "estates/[id]/items" },
  { name: "GET /api/items/[id]", method: "GET", path: "items/[id]" },
  { name: "PATCH /api/items/[id]", method: "PATCH", path: "items/[id]" },
  { name: "DELETE /api/items/[id]", method: "DELETE", path: "items/[id]" },
];

describe("Security Audit: All API routes require authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: null });
  });

  for (const route of API_ROUTES) {
    it(`${route.name} returns 401 without auth`, async () => {
      let handler;
      const params = Promise.resolve({ id: "test-id" });

      switch (route.path) {
        case "estates": {
          const mod = await import("@/app/api/estates/route");
          handler = route.method === "GET" ? mod.GET : mod.POST;
          break;
        }
        case "estates/[id]": {
          const mod = await import("@/app/api/estates/[id]/route");
          handler = route.method === "GET" ? mod.GET
            : route.method === "PATCH" ? mod.PATCH
            : mod.DELETE;
          break;
        }
        case "estates/[id]/items": {
          const mod = await import("@/app/api/estates/[id]/items/route");
          handler = route.method === "GET" ? mod.GET : mod.POST;
          break;
        }
        case "items/[id]": {
          const mod = await import("@/app/api/items/[id]/route");
          handler = route.method === "GET" ? mod.GET
            : route.method === "PATCH" ? mod.PATCH
            : mod.DELETE;
          break;
        }
      }

      const request = new Request("http://localhost:3000/api/test", {
        method: route.method,
        ...(route.method === "POST" || route.method === "PATCH"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
          : {}),
      });

      const response = await handler!(request, { params });
      expect(response.status).toBe(401);
    });
  }
});

describe("Security Audit: Ownership enforcement (403)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_attacker" });
  });

  it("GET /api/estates/[id] returns 403 for wrong user", async () => {
    mockSelect.mockReturnValue(
      chainable([{ id: "estate-1", userId: "user_owner", status: "active" }])
    );

    const mod = await import("@/app/api/estates/[id]/route");
    const res = await mod.GET(
      new Request("http://localhost:3000/api/estates/estate-1"),
      { params: Promise.resolve({ id: "estate-1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("DELETE /api/estates/[id] returns 403 for wrong user", async () => {
    mockSelect.mockReturnValue(
      chainable([{ id: "estate-1", userId: "user_owner", status: "active", itemCount: 0 }])
    );

    const mod = await import("@/app/api/estates/[id]/route");
    const res = await mod.DELETE(
      new Request("http://localhost:3000/api/estates/estate-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "estate-1" }) }
    );
    expect(res.status).toBe(403);
  });
});
