// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { estates, items, itemPhotos, appSettings } from "@/db/schema";

const {
  mockItemSelect,
  mockEstateSelect,
  mockPhotoSelect,
  mockSettingsSelect,
  mockUpdate,
  mockTriage,
  mockGetUsage,
} = vi.hoisted(() => ({
  mockItemSelect: vi.fn(),
  mockEstateSelect: vi.fn(),
  mockPhotoSelect: vi.fn(),
  mockSettingsSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockTriage: vi.fn(),
  mockGetUsage: vi.fn().mockReturnValue({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table === itemPhotos) {
          return {
            where: () => ({
              orderBy: () => mockPhotoSelect(),
            }),
          };
        }
        if (table === items) {
          return { where: () => mockItemSelect() };
        }
        if (table === appSettings) {
          return { where: () => mockSettingsSelect() };
        }
        // estates
        return { where: () => mockEstateSelect() };
      },
    }),
    update: () => ({
      set: () => ({
        where: () => mockUpdate(),
      }),
    }),
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

vi.mock("@/lib/r2", () => ({
  getFileBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
}));

vi.mock("@/lib/image-resize", () => ({
  resizeForTriage: vi.fn(async (buffer: Buffer, mimeType: string) => ({ buffer, mimeType })),
}));

vi.mock("@/lib/ai", () => ({
  getProvider: vi.fn().mockReturnValue({
    name: "anthropic",
    model: "claude-sonnet-4-20250514",
    triage: mockTriage,
    getUsage: mockGetUsage,
  }),
}));

import { GET } from "../route";

const ESTATE = { id: "estate-1", userId: "user_abc", address: "123 Main St", name: null };
const ITEM = { id: "item-1", estateId: "estate-1", status: "pending" };
const PHOTO = { id: "photo-1", itemId: "item-1", r2Key: "test.jpg", mimeType: "image/jpeg", sortOrder: 0 };
const SETTINGS = {
  id: 1,
  aiProvider: "anthropic",
  aiModel: "claude-sonnet-4-20250514",
  apiKeyAnthropic: "encrypted:sk-ant-test",
  apiKeyOpenai: null,
  apiKeyGoogle: null,
};

const VALID_TRIAGE_JSON = JSON.stringify({
  identification: { title: "Old Lamp", description: "A lamp", category: "lighting" },
  tier: "2",
  confidence: "high",
  valuation: { lowEstimate: 20, highEstimate: 40, currency: "USD" },
});

function makeRequest() {
  return new Request("http://localhost/api/items/item-1/triage/stream", { method: "GET" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupMocks() {
  mockItemSelect.mockResolvedValue([ITEM]);
  mockEstateSelect.mockResolvedValue([ESTATE]);
  mockPhotoSelect.mockResolvedValue([PHOTO]);
  mockSettingsSelect.mockResolvedValue([SETTINGS]);
  mockUpdate.mockResolvedValue(undefined);
}

async function readSSEResponse(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

describe("GET /api/items/[id]/triage/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SSE response with correct headers", async () => {
    await mockClerkUser("user_abc");
    setupMocks();
    mockTriage.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield VALID_TRIAGE_JSON;
      },
    });

    const res = await GET(makeRequest(), makeParams("item-1"));

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("streams chunks and sends complete event", async () => {
    await mockClerkUser("user_abc");
    setupMocks();
    mockTriage.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield '{"tier":';
        yield '"2"}';
      },
    });

    const res = await GET(makeRequest(), makeParams("item-1"));
    const text = await readSSEResponse(res);

    expect(text).toContain("data:");
    expect(text).toContain('"type":"chunk"');
    expect(text).toContain("event: complete");
  });

  it("sends error event on provider failure", async () => {
    await mockClerkUser("user_abc");
    setupMocks();
    mockTriage.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        throw new Error("Rate limit exceeded");
      },
    });

    const res = await GET(makeRequest(), makeParams("item-1"));
    const text = await readSSEResponse(res);

    expect(text).toContain("event: error");
    expect(text).toContain("Rate limit exceeded");
  });

  it("updates item in DB after successful triage", async () => {
    await mockClerkUser("user_abc");
    setupMocks();
    mockTriage.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield VALID_TRIAGE_JSON;
      },
    });

    const res = await GET(makeRequest(), makeParams("item-1"));
    await readSSEResponse(res);

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns 404 for non-existent item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([]);

    const res = await GET(makeRequest(), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await GET(makeRequest(), makeParams("item-1"));
    expect(res.status).toBe(401);
  });
});
