import { describe, it, expect } from "vitest";
import { canCloseEstate, getCloseEstateStats } from "../estate-lifecycle";

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    status: "resolved" as string,
    aiValuation: null as { lowEstimate?: number; highEstimate?: number } | null,
    ...overrides,
  };
}

describe("canCloseEstate", () => {
  it("returns false for empty items list", () => {
    expect(canCloseEstate([])).toBe(false);
  });

  it("returns true when all items are resolved", () => {
    const items = [makeItem(), makeItem(), makeItem()];
    expect(canCloseEstate(items)).toBe(true);
  });

  it("returns false when some items are not resolved", () => {
    const items = [makeItem(), makeItem({ status: "triaged" }), makeItem()];
    expect(canCloseEstate(items)).toBe(false);
  });

  it("returns false when any item is pending", () => {
    const items = [makeItem({ status: "pending" })];
    expect(canCloseEstate(items)).toBe(false);
  });

  it("returns false when any item is routed", () => {
    const items = [makeItem(), makeItem({ status: "routed" })];
    expect(canCloseEstate(items)).toBe(false);
  });
});

describe("getCloseEstateStats", () => {
  it("returns correct stats for all resolved items", () => {
    const items = [
      makeItem({ aiValuation: { lowEstimate: 100, highEstimate: 200 } }),
      makeItem({ aiValuation: { lowEstimate: 300, highEstimate: 500 } }),
      makeItem({ aiValuation: null }),
    ];
    const stats = getCloseEstateStats(items);
    expect(stats.totalItems).toBe(3);
    expect(stats.resolvedCount).toBe(3);
    expect(stats.totalEstimatedValueLow).toBe(400);
    expect(stats.totalEstimatedValueHigh).toBe(700);
  });

  it("counts resolved items separately from total", () => {
    const items = [
      makeItem(),
      makeItem({ status: "triaged" }),
      makeItem({ status: "pending" }),
    ];
    const stats = getCloseEstateStats(items);
    expect(stats.totalItems).toBe(3);
    expect(stats.resolvedCount).toBe(1);
  });

  it("returns zero values for empty items", () => {
    const stats = getCloseEstateStats([]);
    expect(stats.totalItems).toBe(0);
    expect(stats.resolvedCount).toBe(0);
    expect(stats.totalEstimatedValueLow).toBe(0);
    expect(stats.totalEstimatedValueHigh).toBe(0);
  });
});
