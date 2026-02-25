// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// Track DB operations per "table"
const mockEstateSelect = vi.fn();
const mockItemInsertReturning = vi.fn();
const mockPhotoInsertReturning = vi.fn();
const mockItemsSelect = vi.fn();
const mockPhotoFirstSelect = vi.fn();

// We need to distinguish tables. Drizzle passes the table object to .from() and .insert().
// We import the real schema to identify tables by reference.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { estates, items, itemPhotos } from "@/db/schema";

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table === itemPhotos) {
          return {
            where: () => ({
              orderBy: () => ({
                limit: () => mockPhotoFirstSelect(),
              }),
            }),
          };
        }
        if (table === items) {
          return {
            where: () => ({
              orderBy: () => mockItemsSelect(),
            }),
          };
        }
        // estates
        return {
          where: () => mockEstateSelect(),
        };
      },
    }),
    insert: (table: unknown) => ({
      values: () => ({
        returning: () => {
          if (table === itemPhotos) return mockPhotoInsertReturning();
          return mockItemInsertReturning();
        },
      }),
    }),
  },
}));

vi.mock("@/lib/r2", () => ({
  uploadFile: vi.fn().mockResolvedValue(undefined),
  generateR2Key: vi.fn().mockReturnValue("estates/e1/items/i1/test-uuid.jpg"),
  getSignedViewUrl: vi.fn().mockResolvedValue("https://signed.example.com/photo.jpg"),
  MAX_FILE_SIZE: 15 * 1024 * 1024,
}));

import { POST, GET } from "../route";
import { uploadFile } from "@/lib/r2";

const ESTATE = {
  id: "estate-1",
  name: "Test Estate",
  address: "123 Main St",
  status: "active",
  userId: "user_abc",
};

const ITEM = {
  id: "item-1",
  estateId: "estate-1",
  tier: null,
  status: "pending",
  notes: null,
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

function makeFormData(files: { name: string; type: string; size?: number }[]) {
  const formData = new FormData();
  files.forEach(({ name, type, size }) => {
    const blob = new Blob([new ArrayBuffer(size || 1024)], { type });
    formData.append("photos", new File([blob], name, { type }));
  });
  return formData;
}

function postRequest(formData: FormData) {
  return new Request("http://localhost/api/estates/estate-1/items", {
    method: "POST",
    body: formData,
  });
}

function getRequest() {
  return new Request("http://localhost/api/estates/estate-1/items", {
    method: "GET",
  });
}

describe("POST /api/estates/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates item with 1 photo", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockItemInsertReturning.mockResolvedValue([ITEM]);
    mockPhotoInsertReturning.mockResolvedValue([PHOTO]);

    const formData = makeFormData([{ name: "photo.jpg", type: "image/jpeg" }]);
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("item-1");
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0].url).toBe("https://signed.example.com/photo.jpg");
  });

  it("creates item with 5 photos", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockItemInsertReturning.mockResolvedValue([ITEM]);
    mockPhotoInsertReturning.mockResolvedValue([PHOTO]);

    const formData = makeFormData([
      { name: "photo1.jpg", type: "image/jpeg" },
      { name: "photo2.jpg", type: "image/jpeg" },
      { name: "photo3.jpg", type: "image/jpeg" },
      { name: "photo4.jpg", type: "image/jpeg" },
      { name: "photo5.jpg", type: "image/jpeg" },
    ]);
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(201);
    expect(uploadFile).toHaveBeenCalledTimes(5);
  });

  it("rejects 0 photos", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const formData = new FormData();
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("photo");
  });

  it("rejects more than 5 photos", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const formData = makeFormData(
      Array.from({ length: 6 }, (_, i) => ({ name: `photo${i}.jpg`, type: "image/jpeg" }))
    );
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("5");
  });

  it("rejects non-image files", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const formData = makeFormData([{ name: "doc.pdf", type: "application/pdf" }]);
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not allowed");
  });

  it("returns 404 for non-existent estate", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([]);

    const formData = makeFormData([{ name: "photo.jpg", type: "image/jpeg" }]);
    const res = await POST(postRequest(formData), makeParams("missing-id"));

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owned estate", async () => {
    await mockClerkUser("user_other");
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const formData = makeFormData([{ name: "photo.jpg", type: "image/jpeg" }]);
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);

    const formData = makeFormData([{ name: "photo.jpg", type: "image/jpeg" }]);
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(401);
  });

  it("creates item with status pending and tier null", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockItemInsertReturning.mockResolvedValue([ITEM]);
    mockPhotoInsertReturning.mockResolvedValue([PHOTO]);

    const formData = makeFormData([{ name: "photo.jpg", type: "image/jpeg" }]);
    const res = await POST(postRequest(formData), makeParams("estate-1"));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.tier).toBeNull();
  });
});

describe("GET /api/estates/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items with thumbnail URLs", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockItemsSelect.mockResolvedValue([ITEM]);
    mockPhotoFirstSelect.mockResolvedValue([PHOTO]);

    const res = await GET(getRequest(), makeParams("estate-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("item-1");
    expect(body[0].thumbnailUrl).toBe("https://signed.example.com/photo.jpg");
  });

  it("returns empty array for no items", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockItemsSelect.mockResolvedValue([]);

    const res = await GET(getRequest(), makeParams("estate-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 404 for non-existent estate", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([]);

    const res = await GET(getRequest(), makeParams("missing-id"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owned estate", async () => {
    await mockClerkUser("user_other");
    mockEstateSelect.mockResolvedValue([ESTATE]);

    const res = await GET(getRequest(), makeParams("estate-1"));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);

    const res = await GET(getRequest(), makeParams("estate-1"));
    expect(res.status).toBe(401);
  });

  it("returns null thumbnailUrl when item has no photos", async () => {
    await mockClerkUser("user_abc");
    mockEstateSelect.mockResolvedValue([ESTATE]);
    mockItemsSelect.mockResolvedValue([ITEM]);
    mockPhotoFirstSelect.mockResolvedValue([]);

    const res = await GET(getRequest(), makeParams("estate-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].thumbnailUrl).toBeNull();
  });
});
