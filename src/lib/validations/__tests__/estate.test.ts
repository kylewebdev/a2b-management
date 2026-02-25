import { describe, it, expect } from "vitest";
import { createEstateSchema, parseUpdateEstate } from "../estate";

describe("createEstateSchema", () => {
  it("passes with valid input", () => {
    const result = createEstateSchema.safeParse({
      name: "Grandma's House",
      address: "123 Main St",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Grandma's House");
      expect(result.data.address).toBe("123 Main St");
      expect(result.data.clientName).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("passes with address only (name is optional)", () => {
    const result = createEstateSchema.safeParse({ address: "123 Main St" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeNull();
    }
  });

  it("fails when address is missing", () => {
    const result = createEstateSchema.safeParse({ name: "Estate" });
    expect(result.success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = createEstateSchema.safeParse({
      name: "  Padded Name  ",
      address: "  456 Oak Ave  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Padded Name");
      expect(result.data.address).toBe("456 Oak Ave");
    }
  });

  it("fails on empty strings", () => {
    const result = createEstateSchema.safeParse({ name: "", address: "" });
    expect(result.success).toBe(false);
  });

  it("fails on whitespace-only strings", () => {
    const result = createEstateSchema.safeParse({ name: "   ", address: "   " });
    expect(result.success).toBe(false);
  });

  it("transforms empty optional fields to null", () => {
    const result = createEstateSchema.safeParse({
      name: "Estate",
      address: "123 Main St",
      clientName: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientName).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("keeps non-empty optional fields", () => {
    const result = createEstateSchema.safeParse({
      name: "Estate",
      address: "123 Main St",
      clientName: "Jane Doe",
      notes: "Has a dog",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientName).toBe("Jane Doe");
      expect(result.data.notes).toBe("Has a dog");
    }
  });
});

describe("updateEstateSchema", () => {
  it("passes with partial update", () => {
    const result = parseUpdateEstate({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("passes with status update", () => {
    const result = parseUpdateEstate({ status: "resolving" });
    expect(result.success).toBe(true);
  });

  it("validates status enum", () => {
    const result = parseUpdateEstate({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("fails on empty object", () => {
    const result = parseUpdateEstate({});
    expect(result.success).toBe(false);
  });

  it("passes with multiple fields", () => {
    const result = parseUpdateEstate({
      name: "Updated",
      address: "789 Elm",
      status: "closed",
    });
    expect(result.success).toBe(true);
  });
});
