import { describe, it, expect } from "vitest";
import { computeEstateSummary } from "../estate-summary";

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    tier: null as string | null,
    status: "pending" as string,
    aiValuation: null as { lowEstimate?: number; highEstimate?: number } | null,
    ...overrides,
  };
}

describe("computeEstateSummary", () => {
  it("returns zeroed summary for empty items list", () => {
    const summary = computeEstateSummary([]);
    expect(summary.totalCount).toBe(0);
    expect(summary.unresolvedCount).toBe(0);
    expect(summary.totalEstimatedValueLow).toBe(0);
    expect(summary.totalEstimatedValueHigh).toBe(0);
    expect(summary.tierBreakdown).toEqual({ "1": 0, "2": 0, "3": 0, "4": 0, untiered: 0 });
    expect(summary.statusBreakdown).toEqual({ pending: 0, triaged: 0, routed: 0, resolved: 0 });
  });

  it("counts tier breakdown correctly", () => {
    const items = [
      makeItem({ tier: "1" }),
      makeItem({ tier: "1" }),
      makeItem({ tier: "3" }),
      makeItem({ tier: null }),
    ];
    const summary = computeEstateSummary(items);
    expect(summary.tierBreakdown).toEqual({ "1": 2, "2": 0, "3": 1, "4": 0, untiered: 1 });
  });

  it("counts status breakdown correctly", () => {
    const items = [
      makeItem({ status: "pending" }),
      makeItem({ status: "triaged" }),
      makeItem({ status: "triaged" }),
      makeItem({ status: "resolved" }),
    ];
    const summary = computeEstateSummary(items);
    expect(summary.statusBreakdown).toEqual({ pending: 1, triaged: 2, routed: 0, resolved: 1 });
  });

  it("computes total estimated value", () => {
    const items = [
      makeItem({ aiValuation: { lowEstimate: 50, highEstimate: 100 } }),
      makeItem({ aiValuation: { lowEstimate: 200, highEstimate: 500 } }),
      makeItem({ aiValuation: null }),
    ];
    const summary = computeEstateSummary(items);
    expect(summary.totalEstimatedValueLow).toBe(250);
    expect(summary.totalEstimatedValueHigh).toBe(600);
  });

  it("counts unresolved items", () => {
    const items = [
      makeItem({ status: "pending" }),
      makeItem({ status: "triaged" }),
      makeItem({ status: "routed" }),
      makeItem({ status: "resolved" }),
    ];
    const summary = computeEstateSummary(items);
    expect(summary.unresolvedCount).toBe(3);
    expect(summary.totalCount).toBe(4);
  });

  it("handles items with partial valuation", () => {
    const items = [
      makeItem({ aiValuation: { lowEstimate: 100 } }),
      makeItem({ aiValuation: { highEstimate: 200 } }),
    ];
    const summary = computeEstateSummary(items);
    expect(summary.totalEstimatedValueLow).toBe(100);
    expect(summary.totalEstimatedValueHigh).toBe(200);
  });

  it("handles mixed data correctly", () => {
    const items = [
      makeItem({ tier: "2", status: "triaged", aiValuation: { lowEstimate: 50, highEstimate: 150 } }),
      makeItem({ tier: "4", status: "resolved", aiValuation: { lowEstimate: 5000, highEstimate: 10000 } }),
      makeItem({ tier: "1", status: "pending", aiValuation: null }),
    ];
    const summary = computeEstateSummary(items);
    expect(summary.totalCount).toBe(3);
    expect(summary.unresolvedCount).toBe(2);
    expect(summary.totalEstimatedValueLow).toBe(5050);
    expect(summary.totalEstimatedValueHigh).toBe(10150);
  });
});
