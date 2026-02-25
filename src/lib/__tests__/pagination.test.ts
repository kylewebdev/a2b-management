// @vitest-environment node
import { describe, it, expect } from "vitest";
import { encodeCursor, parseCursor, DEFAULT_PAGE_SIZE } from "../pagination";

describe("pagination", () => {
  it("exports DEFAULT_PAGE_SIZE of 20", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it("encodes a date to a base64 cursor", () => {
    const date = new Date("2025-06-15T10:30:00.000Z");
    const cursor = encodeCursor(date);
    expect(typeof cursor).toBe("string");
    expect(cursor.length).toBeGreaterThan(0);
  });

  it("round-trips date through encode/parse", () => {
    const original = new Date("2025-06-15T10:30:00.000Z");
    const cursor = encodeCursor(original);
    const parsed = parseCursor(cursor);
    expect(parsed).toEqual(original);
  });

  it("returns null for invalid cursor", () => {
    expect(parseCursor("not-valid-base64!!!")).toBeNull();
  });

  it("returns null for base64 that decodes to non-date", () => {
    const cursor = Buffer.from("not-a-date").toString("base64");
    expect(parseCursor(cursor)).toBeNull();
  });
});
