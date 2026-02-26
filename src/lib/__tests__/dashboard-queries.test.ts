// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecute = vi.fn();

vi.mock("@/db", () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}));

import {
  getDashboardStats,
  getAttentionEstates,
  getRankedEstates,
} from "../dashboard-queries";

beforeEach(() => {
  mockExecute.mockReset();
});

describe("getDashboardStats", () => {
  it("returns stats from query result", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          active_estates: 3,
          items_pending_triage: 5,
          items_pending_disposition: 2,
          total_estimated_value_low: 1000,
          total_estimated_value_high: 3000,
        },
      ],
    });

    const stats = await getDashboardStats("user-1");

    expect(stats).toEqual({
      activeEstates: 3,
      itemsPendingTriage: 5,
      itemsPendingDisposition: 2,
      totalEstimatedValueLow: 1000,
      totalEstimatedValueHigh: 3000,
    });
  });

  it("returns zeroes when no rows returned", async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const stats = await getDashboardStats("user-1");

    expect(stats).toEqual({
      activeEstates: 0,
      itemsPendingTriage: 0,
      itemsPendingDisposition: 0,
      totalEstimatedValueLow: 0,
      totalEstimatedValueHigh: 0,
    });
  });

  it("coerces string numbers to Number", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          active_estates: "2",
          items_pending_triage: "0",
          items_pending_disposition: "1",
          total_estimated_value_low: "500.50",
          total_estimated_value_high: "1200.00",
        },
      ],
    });

    const stats = await getDashboardStats("user-1");

    expect(stats.activeEstates).toBe(2);
    expect(stats.totalEstimatedValueLow).toBe(500.5);
  });
});

describe("getAttentionEstates", () => {
  it("returns deduplicated estates with highest-priority reason", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          id: "estate-1",
          name: "House A",
          address: "123 Main St",
          reason: "awaiting_disposition",
          reason_detail: "2 items awaiting disposition",
          item_count: 5,
        },
        {
          id: "estate-1",
          name: "House A",
          address: "123 Main St",
          reason: "stale",
          reason_detail: "No activity for 7+ days",
          item_count: 5,
        },
        {
          id: "estate-2",
          name: null,
          address: "456 Oak Ave",
          reason: "low_confidence",
          reason_detail: "1 low-confidence item",
          item_count: 3,
        },
      ],
    });

    const estates = await getAttentionEstates("user-1");

    expect(estates).toHaveLength(2);
    expect(estates[0].id).toBe("estate-1");
    expect(estates[0].reason).toBe("awaiting_disposition");
    expect(estates[1].id).toBe("estate-2");
    expect(estates[1].reason).toBe("low_confidence");
  });

  it("returns empty array when no attention estates", async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const estates = await getAttentionEstates("user-1");

    expect(estates).toEqual([]);
  });
});

describe("getRankedEstates", () => {
  it("returns ranked estates with enriched data", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          id: "estate-1",
          name: "House A",
          address: "123 Main St",
          status: "active",
          item_count: 10,
          pending_count: 3,
          estimated_value_low: 500,
          estimated_value_high: 2000,
          last_activity: "2026-01-15T12:00:00Z",
        },
      ],
    });

    const estates = await getRankedEstates("user-1");

    expect(estates).toHaveLength(1);
    expect(estates[0]).toEqual({
      id: "estate-1",
      name: "House A",
      address: "123 Main St",
      status: "active",
      itemCount: 10,
      pendingCount: 3,
      estimatedValueLow: 500,
      estimatedValueHigh: 2000,
      lastActivity: "2026-01-15T12:00:00Z",
    });
  });

  it("converts last_activity to string", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          id: "estate-1",
          name: null,
          address: "123 Main St",
          status: "active",
          item_count: 2,
          pending_count: 1,
          estimated_value_low: 0,
          estimated_value_high: 0,
          last_activity: "2026-01-15T12:00:00Z",
        },
      ],
    });

    const estates = await getRankedEstates("user-1");

    expect(estates[0].lastActivity).toBe("2026-01-15T12:00:00Z");
  });

  it("returns empty array when no estates", async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const estates = await getRankedEstates("user-1");

    expect(estates).toEqual([]);
  });
});
