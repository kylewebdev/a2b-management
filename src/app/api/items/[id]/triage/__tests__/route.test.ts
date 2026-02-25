// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { estates, items, itemPhotos, appSettings } from "@/db/schema";

const mockDbResult = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table === itemPhotos) {
          return { where: () => mockDbResult() };
        }
        if (table === items) {
          return { where: () => mockDbResult() };
        }
        if (table === estates) {
          return { where: () => mockDbResult() };
        }
        if (table === appSettings) {
          return { where: () => mockDbResult() };
        }
        return { where: () => mockDbResult() };
      },
    }),
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((val: string) => {
    if (val === "corrupted") throw new Error("Decrypt failed");
    return val.replace("encrypted:", "");
  }),
}));

import { POST } from "../route";

const ESTATE = { id: "estate-1", userId: "user_abc", address: "123 Main St", name: null };
const ITEM = { id: "item-1", estateId: "estate-1", status: "pending" };
const PHOTO = { id: "photo-1", itemId: "item-1", r2Key: "test.jpg" };
const SETTINGS = {
  id: 1,
  aiProvider: "anthropic",
  aiModel: "claude-sonnet-4-20250514",
  apiKeyAnthropic: "encrypted:sk-ant-test",
  apiKeyOpenai: null,
  apiKeyGoogle: null,
};

function makeRequest() {
  return new Request("http://localhost/api/items/item-1/triage", { method: "POST" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/items/[id]/triage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 202 when item is ready for triage", async () => {
    await mockClerkUser("user_abc");
    mockDbResult
      .mockResolvedValueOnce([ITEM])     // items select
      .mockResolvedValueOnce([ESTATE])   // estates select
      .mockResolvedValueOnce([PHOTO])    // photos select
      .mockResolvedValueOnce([SETTINGS]); // settings select

    const res = await POST(makeRequest(), makeParams("item-1"));

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe("accepted");
  });

  it("returns 400 when item has no photos", async () => {
    await mockClerkUser("user_abc");
    mockDbResult
      .mockResolvedValueOnce([ITEM])
      .mockResolvedValueOnce([ESTATE])
      .mockResolvedValueOnce([]);        // no photos

    const res = await POST(makeRequest(), makeParams("item-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("no photos");
  });

  it("returns 400 when no settings configured", async () => {
    await mockClerkUser("user_abc");
    mockDbResult
      .mockResolvedValueOnce([ITEM])
      .mockResolvedValueOnce([ESTATE])
      .mockResolvedValueOnce([PHOTO])
      .mockResolvedValueOnce([]);        // no settings

    const res = await POST(makeRequest(), makeParams("item-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not configured");
  });

  it("returns 400 when no API key for provider", async () => {
    await mockClerkUser("user_abc");
    mockDbResult
      .mockResolvedValueOnce([ITEM])
      .mockResolvedValueOnce([ESTATE])
      .mockResolvedValueOnce([PHOTO])
      .mockResolvedValueOnce([{ ...SETTINGS, apiKeyAnthropic: null }]);

    const res = await POST(makeRequest(), makeParams("item-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No API key");
  });

  it("returns 404 for non-existent item", async () => {
    await mockClerkUser("user_abc");
    mockDbResult.mockResolvedValueOnce([]);

    const res = await POST(makeRequest(), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owned item", async () => {
    await mockClerkUser("user_other");
    mockDbResult
      .mockResolvedValueOnce([ITEM])
      .mockResolvedValueOnce([ESTATE]);

    const res = await POST(makeRequest(), makeParams("item-1"));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await POST(makeRequest(), makeParams("item-1"));
    expect(res.status).toBe(401);
  });
});
