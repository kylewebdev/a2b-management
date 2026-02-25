import { describe, it, expect } from "vitest";
import {
  MAX_PHOTOS,
  MIN_PHOTOS,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  updateItemSchema,
} from "../item";

describe("Item validation constants", () => {
  it("MAX_PHOTOS is 5", () => {
    expect(MAX_PHOTOS).toBe(5);
  });

  it("MIN_PHOTOS is 1", () => {
    expect(MIN_PHOTOS).toBe(1);
  });

  it("MAX_FILE_SIZE is 15MB", () => {
    expect(MAX_FILE_SIZE).toBe(15 * 1024 * 1024);
  });

  it("ALLOWED_MIME_TYPES includes common image types", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_MIME_TYPES).toContain("image/webp");
    expect(ALLOWED_MIME_TYPES).toContain("image/heic");
    expect(ALLOWED_MIME_TYPES).toContain("image/heif");
  });
});

describe("updateItemSchema", () => {
  it("accepts valid notes update", () => {
    const result = updateItemSchema.safeParse({ notes: "Antique desk" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("Antique desk");
  });

  it("accepts valid disposition update", () => {
    const result = updateItemSchema.safeParse({ disposition: "sell" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.disposition).toBe("sell");
  });

  it("trims whitespace from notes", () => {
    const result = updateItemSchema.safeParse({ notes: "  spaced  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("spaced");
  });

  it("transforms empty notes to null", () => {
    const result = updateItemSchema.safeParse({ notes: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeNull();
  });

  it("accepts null notes", () => {
    const result = updateItemSchema.safeParse({ notes: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeNull();
  });

  it("accepts both fields together", () => {
    const result = updateItemSchema.safeParse({ notes: "Nice chair", disposition: "keep" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Nice chair");
      expect(result.data.disposition).toBe("keep");
    }
  });
});
