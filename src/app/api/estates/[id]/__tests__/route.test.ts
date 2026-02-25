import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// Track all db operations
const mockSelectResult = vi.fn();
const mockCountResult = vi.fn();
const mockUpdateResult = vi.fn();
const mockDeleteExec = vi.fn();

function chainSelect() {
  return {
    from: () => ({
      where: () => mockSelectResult(),
    }),
  };
}

function chainCount() {
  return {
    from: () => ({
      where: () => mockCountResult(),
    }),
  };
}

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      // Distinguish between count() selects and regular selects
      const arg = args[0] as Record<string, unknown> | undefined;
      if (arg && "itemCount" in arg) {
        return chainCount();
      }
      return chainSelect();
    },
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => mockUpdateResult(),
        }),
      }),
    }),
    delete: () => ({
      where: () => mockDeleteExec(),
    }),
  },
}));

import { GET, PATCH, DELETE } from "../route";

const ESTATE = {
  id: "uuid-1",
  name: "Test Estate",
  address: "123 Main St",
  status: "active",
  clientName: null,
  notes: null,
  userId: "user_abc",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/estates/uuid-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/estates/uuid-1", { method: "DELETE" });
}

function getRequest() {
  return new Request("http://localhost/api/estates/uuid-1", { method: "GET" });
}

describe("GET /api/estates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns own estate", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);

    const res = await GET(getRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Test Estate");
  });

  it("returns 404 for missing estate", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([]);

    const res = await GET(getRequest(), makeParams("uuid-missing"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner", async () => {
    await mockClerkUser("user_other");
    mockSelectResult.mockResolvedValue([ESTATE]);

    const res = await GET(getRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);
    const res = await GET(getRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/estates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates fields", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);
    mockUpdateResult.mockResolvedValue([{ ...ESTATE, name: "Updated" }]);

    const res = await PATCH(patchRequest({ name: "Updated" }), makeParams("uuid-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated");
  });

  it("allows valid transition active→resolving", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);
    mockUpdateResult.mockResolvedValue([{ ...ESTATE, status: "resolving" }]);

    const res = await PATCH(patchRequest({ status: "resolving" }), makeParams("uuid-1"));
    expect(res.status).toBe(200);
  });

  it("allows valid transition resolving→closed", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([{ ...ESTATE, status: "resolving" }]);
    mockUpdateResult.mockResolvedValue([{ ...ESTATE, status: "closed" }]);

    const res = await PATCH(patchRequest({ status: "closed" }), makeParams("uuid-1"));
    expect(res.status).toBe(200);
  });

  it("rejects invalid transition active→closed", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);

    const res = await PATCH(patchRequest({ status: "closed" }), makeParams("uuid-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid status transition");
  });

  it("rejects backward transition closed→active", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([{ ...ESTATE, status: "closed" }]);

    const res = await PATCH(patchRequest({ status: "active" }), makeParams("uuid-1"));
    expect(res.status).toBe(400);
  });

  it("returns 403 for non-owner", async () => {
    await mockClerkUser("user_other");
    mockSelectResult.mockResolvedValue([ESTATE]);

    const res = await PATCH(patchRequest({ name: "Hack" }), makeParams("uuid-1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 with empty body", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);

    const res = await PATCH(patchRequest({}), makeParams("uuid-1"));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/estates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes empty estate", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);
    mockCountResult.mockResolvedValue([{ itemCount: 0 }]);
    mockDeleteExec.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  it("returns 409 when estate has items", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([ESTATE]);
    mockCountResult.mockResolvedValue([{ itemCount: 5 }]);

    const res = await DELETE(deleteRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Cannot delete estate with items");
  });

  it("returns 403 for non-owner", async () => {
    await mockClerkUser("user_other");
    mockSelectResult.mockResolvedValue([ESTATE]);

    const res = await DELETE(deleteRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing estate", async () => {
    await mockClerkUser("user_abc");
    mockSelectResult.mockResolvedValue([]);

    const res = await DELETE(deleteRequest(), makeParams("uuid-missing"));
    expect(res.status).toBe(404);
  });
});
