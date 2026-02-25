import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// Mock the db module
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...vArgs: unknown[]) => {
          mockValues(...vArgs);
          return { returning: () => mockReturning() };
        },
      };
    },
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs);
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs);
              return { orderBy: () => mockOrderBy() };
            },
          };
        },
      };
    },
  },
}));

import { POST, GET } from "../route";

function jsonRequest(body: unknown, url = "http://localhost/api/estates") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(url = "http://localhost/api/estates") {
  return new Request(url, { method: "GET" });
}

describe("POST /api/estates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 with valid input", async () => {
    await mockClerkUser("user_abc");
    const estate = {
      id: "uuid-1",
      name: "Test Estate",
      address: "123 Main St",
      clientName: null,
      notes: null,
      status: "active",
      userId: "user_abc",
    };
    mockReturning.mockResolvedValue([estate]);

    const res = await POST(jsonRequest({ name: "Test Estate", address: "123 Main St" }) as never);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe("Test Estate");
    expect(body.userId).toBe("user_abc");
  });

  it("returns 201 when name is missing (optional)", async () => {
    await mockClerkUser("user_abc");
    const estate = { id: "uuid-2", name: null, address: "123 Main St", userId: "user_abc" };
    mockReturning.mockResolvedValue([estate]);

    const res = await POST(jsonRequest({ address: "123 Main St" }) as never);
    expect(res.status).toBe(201);
  });

  it("returns 400 when address is missing", async () => {
    await mockClerkUser("user_abc");
    const res = await POST(jsonRequest({ name: "Estate" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await POST(jsonRequest({ name: "Estate", address: "123 Main" }) as never);
    expect(res.status).toBe(401);
  });

  it("attaches userId from auth", async () => {
    await mockClerkUser("user_xyz");
    const estate = { id: "uuid-1", name: "E", userId: "user_xyz" };
    mockReturning.mockResolvedValue([estate]);

    await POST(jsonRequest({ name: "E", address: "Addr" }) as never);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_xyz" }),
    );
  });
});

describe("GET /api/estates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user estates", async () => {
    await mockClerkUser("user_abc");
    const estatesList = [
      { id: "1", name: "E1", itemCount: 3 },
      { id: "2", name: "E2", itemCount: 0 },
    ];
    mockOrderBy.mockResolvedValue(estatesList);

    const res = await GET(getRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("returns empty array when no estates", async () => {
    await mockClerkUser("user_abc");
    mockOrderBy.mockResolvedValue([]);

    const res = await GET(getRequest() as never);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("filters by status", async () => {
    await mockClerkUser("user_abc");
    mockOrderBy.mockResolvedValue([{ id: "1", status: "active" }]);

    const res = await GET(getRequest("http://localhost/api/estates?status=active") as never);
    expect(res.status).toBe(200);
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns 400 for invalid status filter", async () => {
    await mockClerkUser("user_abc");

    const res = await GET(getRequest("http://localhost/api/estates?status=bogus") as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await GET(getRequest() as never);
    expect(res.status).toBe(401);
  });
});
