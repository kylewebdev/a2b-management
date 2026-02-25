// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

const mockItemSelect = vi.fn();
const mockEstateSelect = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateReturning = vi.fn();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { estates, items, itemPhotos } from "@/db/schema";

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table === items) {
          return { where: () => mockItemSelect() };
        }
        return { where: () => mockEstateSelect() };
      },
    }),
    update: () => ({
      set: (data: unknown) => {
        mockUpdateSet(data);
        return {
          where: () => ({
            returning: () => mockUpdateReturning(),
          }),
        };
      },
    }),
  },
}));

vi.mock("@/lib/r2", () => ({
  getSignedViewUrl: vi.fn().mockResolvedValue("https://signed.example.com/photo.jpg"),
  deleteFiles: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from "../route";

const ESTATE = { id: "estate-1", userId: "user_abc" };

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    estateId: "estate-1",
    tier: "2",
    status: "triaged",
    notes: null,
    disposition: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/items/item-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/items/[id] — disposition logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEstateSelect.mockResolvedValue([ESTATE]);
  });

  it("auto-resolves when disposition is set on triaged item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "triaged" })]);
    mockUpdateReturning.mockResolvedValue([makeItem({ status: "resolved", disposition: "sold_onsite" })]);

    const res = await PATCH(patchRequest({ disposition: "sold_onsite" }), makeParams("item-1"));
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ disposition: "sold_onsite", status: "resolved" })
    );
  });

  it("auto-resolves when disposition is set on routed item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "routed" })]);
    mockUpdateReturning.mockResolvedValue([makeItem({ status: "resolved", disposition: "donated" })]);

    const res = await PATCH(patchRequest({ disposition: "donated" }), makeParams("item-1"));
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ disposition: "donated", status: "resolved" })
    );
  });

  it("rejects disposition on pending item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "pending" })]);

    const res = await PATCH(patchRequest({ disposition: "trashed" }), makeParams("item-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/triage/i);
  });

  it("allows clearing disposition (null) without status change", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "resolved", disposition: "sold_onsite" })]);
    mockUpdateReturning.mockResolvedValue([makeItem({ status: "resolved", disposition: null })]);

    const res = await PATCH(patchRequest({ disposition: null }), makeParams("item-1"));
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ disposition: null })
    );
    // Should NOT include status in the update when clearing
    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(setCall.status).toBeUndefined();
  });

  it("rejects invalid disposition values", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "triaged" })]);

    const res = await PATCH(patchRequest({ disposition: "sell" }), makeParams("item-1"));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/items/[id] — status transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEstateSelect.mockResolvedValue([ESTATE]);
  });

  it("allows triaged → routed", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "triaged" })]);
    mockUpdateReturning.mockResolvedValue([makeItem({ status: "routed" })]);

    const res = await PATCH(patchRequest({ status: "routed" }), makeParams("item-1"));
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "routed" })
    );
  });

  it("rejects invalid status transition (pending → routed)", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "pending" })]);

    const res = await PATCH(patchRequest({ status: "routed" }), makeParams("item-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/transition/i);
  });

  it("rejects resolved → routed", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "resolved" })]);

    const res = await PATCH(patchRequest({ status: "routed" }), makeParams("item-1"));
    expect(res.status).toBe(400);
  });

  it("rejects status: resolved directly (must use disposition)", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "triaged" })]);

    const res = await PATCH(patchRequest({ status: "resolved" }), makeParams("item-1"));
    // schema rejects "resolved" — only "routed" is accepted
    expect(res.status).toBe(400);
  });

  it("allows notes-only update without status change", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "triaged" })]);
    mockUpdateReturning.mockResolvedValue([makeItem({ notes: "Good condition" })]);

    const res = await PATCH(patchRequest({ notes: "Good condition" }), makeParams("item-1"));
    expect(res.status).toBe(200);
    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(setCall.notes).toBe("Good condition");
    expect(setCall.status).toBeUndefined();
  });

  it("handles disposition + notes together", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([makeItem({ status: "triaged" })]);
    mockUpdateReturning.mockResolvedValue([makeItem({ status: "resolved", disposition: "bulk_lot", notes: "Low value" })]);

    const res = await PATCH(
      patchRequest({ disposition: "bulk_lot", notes: "Low value" }),
      makeParams("item-1")
    );
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ disposition: "bulk_lot", notes: "Low value", status: "resolved" })
    );
  });
});
