import { describe, it, expect } from "vitest";
import { getAuthUserId, jsonError, jsonSuccess } from "../api";
import { mockClerkUser } from "@/test/helpers";

describe("getAuthUserId", () => {
  it("returns userId when authenticated", async () => {
    await mockClerkUser("user_abc123");
    const userId = await getAuthUserId();
    expect(userId).toBe("user_abc123");
  });

  it("returns null when unauthenticated", async () => {
    await mockClerkUser(null);
    const userId = await getAuthUserId();
    expect(userId).toBeNull();
  });
});

describe("jsonError", () => {
  it("returns correct status and body with string message", async () => {
    const res = jsonError("Not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns correct status and body with object message", async () => {
    const res = jsonError({ error: "Validation failed", details: ["bad"] }, 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Validation failed", details: ["bad"] });
  });
});

describe("jsonSuccess", () => {
  it("returns 200 with data by default", async () => {
    const res = jsonSuccess({ id: "1", name: "Test" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "1", name: "Test" });
  });

  it("returns custom status", async () => {
    const res = jsonSuccess({ id: "1" }, 201);
    expect(res.status).toBe(201);
  });
});
