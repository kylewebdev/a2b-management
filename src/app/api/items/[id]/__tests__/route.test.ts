// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

const mockItemSelect = vi.fn();
const mockEstateSelect = vi.fn();
const mockPhotoSelect = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteExec = vi.fn();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { estates, items, itemPhotos } from "@/db/schema";

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table === itemPhotos) {
          return {
            where: () => {
              // Make it both awaitable (for DELETE) and chainable (for GET)
              const promise = mockPhotoSelect();
              promise.orderBy = () => mockPhotoSelect();
              return promise;
            },
          };
        }
        if (table === items) {
          return {
            where: () => mockItemSelect(),
          };
        }
        // estates
        return {
          where: () => mockEstateSelect(),
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => mockUpdateReturning(),
        }),
      }),
    }),
    delete: () => ({
      where: () => mockDeleteExec(),
    }),
  },
}));

vi.mock("@/lib/r2", () => ({
  getSignedViewUrl: vi.fn().mockResolvedValue("https://signed.example.com/photo.jpg"),
  deleteFiles: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PATCH, DELETE } from "../route";
import { deleteFiles } from "@/lib/r2";

const ESTATE = {
  id: "estate-1",
  userId: "user_abc",
};

const ITEM = {
  id: "item-1",
  estateId: "estate-1",
  tier: "2",
  status: "triaged",
  notes: "Old desk",
  disposition: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PHOTO = {
  id: "photo-1",
  itemId: "item-1",
  r2Key: "estates/estate-1/items/item-1/test.jpg",
  originalFilename: "test.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  sortOrder: 0,
  createdAt: new Date(),
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function getRequest() {
  return new Request("http://localhost/api/items/item-1", { method: "GET" });
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/items/item-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/items/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns item with photos and signed URLs", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockPhotoSelect.mockResolvedValue([PHOTO]);

    const res = await GET(getRequest(), makeParams("item-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("item-1");
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0].url).toBe("https://signed.example.com/photo.jpg");
  });

  it("returns 404 for non-existent item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([]);

    const res = await GET(getRequest(), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owned item", async () => {
    await mockClerkUser("user_other");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const res = await GET(getRequest(), makeParams("item-1"));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await GET(getRequest(), makeParams("item-1"));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/items/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates notes", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockUpdateReturning.mockResolvedValue([{ ...ITEM, notes: "Updated notes" }]);

    const res = await PATCH(patchRequest({ notes: "Updated notes" }), makeParams("item-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notes).toBe("Updated notes");
  });

  it("updates disposition", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockUpdateReturning.mockResolvedValue([{ ...ITEM, disposition: "sold_onsite", status: "resolved" }]);

    const res = await PATCH(patchRequest({ disposition: "sold_onsite" }), makeParams("item-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.disposition).toBe("sold_onsite");
  });

  it("returns 404 for non-existent item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([]);

    const res = await PATCH(patchRequest({ notes: "test" }), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owned item", async () => {
    await mockClerkUser("user_other");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const res = await PATCH(patchRequest({ notes: "test" }), makeParams("item-1"));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await PATCH(patchRequest({ notes: "test" }), makeParams("item-1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const req = new Request("http://localhost/api/items/item-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await PATCH(req, makeParams("item-1"));
    expect(res.status).toBe(400);
  });
});

function deleteRequest() {
  return new Request("http://localhost/api/items/item-1", { method: "DELETE" });
}

describe("DELETE /api/items/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes item and its R2 files", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockPhotoSelect.mockResolvedValue([PHOTO]);
    mockDeleteExec.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest(), makeParams("item-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    expect(deleteFiles).toHaveBeenCalledWith([PHOTO.r2Key]);
  });

  it("deletes item even when no photos exist", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockPhotoSelect.mockResolvedValue([]);
    mockDeleteExec.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest(), makeParams("item-1"));

    expect(res.status).toBe(200);
    expect(deleteFiles).not.toHaveBeenCalled();
  });

  it("returns 404 for non-existent item", async () => {
    await mockClerkUser("user_abc");
    mockItemSelect.mockResolvedValue([]);

    const res = await DELETE(deleteRequest(), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owned item", async () => {
    await mockClerkUser("user_other");
    mockItemSelect.mockResolvedValue([ITEM]);
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const res = await DELETE(deleteRequest(), makeParams("item-1"));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await DELETE(deleteRequest(), makeParams("item-1"));
    expect(res.status).toBe(401);
  });
});
