// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClerkUser } from "@/test/helpers";

// Mock db module
const mockSelect = vi.fn();
vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

describe("GET /api/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    await mockClerkUser(null);

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns aggregated usage data", async () => {
    await mockClerkUser("user_test123");

    // Mock: estates query
    const estatesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: "estate-1" },
        { id: "estate-2" },
      ]),
    };

    // Mock: lifetime aggregate query
    const lifetimeChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        {
          aiProvider: "anthropic/claude-sonnet-4-20250514",
          totalInput: 5000,
          totalOutput: 1000,
          totalTokens: 6000,
          triageCount: 3,
        },
      ]),
    };

    // Mock: today aggregate query
    const todayChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        {
          aiProvider: "anthropic/claude-sonnet-4-20250514",
          totalInput: 2000,
          totalOutput: 500,
          totalTokens: 2500,
          triageCount: 1,
        },
      ]),
    };

    // Mock: per-estate query
    const perEstateChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        {
          estateId: "estate-1",
          estateAddress: "123 Main St",
          aiProvider: "anthropic/claude-sonnet-4-20250514",
          totalInput: 3000,
          totalOutput: 600,
          totalTokens: 3600,
          triageCount: 2,
        },
        {
          estateId: "estate-2",
          estateAddress: "456 Oak Ave",
          aiProvider: "anthropic/claude-sonnet-4-20250514",
          totalInput: 2000,
          totalOutput: 400,
          totalTokens: 2400,
          triageCount: 1,
        },
      ]),
    };

    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1: return estatesChain;
        case 2: return lifetimeChain;
        case 3: return todayChain;
        case 4: return perEstateChain;
        default: return estatesChain;
      }
    });

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();

    // Lifetime data
    expect(data.lifetime.byProvider).toHaveLength(1);
    expect(data.lifetime.byProvider[0].provider).toBe("anthropic/claude-sonnet-4-20250514");
    expect(data.lifetime.byProvider[0].inputTokens).toBe(5000);
    expect(data.lifetime.byProvider[0].outputTokens).toBe(1000);
    expect(data.lifetime.byProvider[0].triageCount).toBe(3);
    expect(typeof data.lifetime.byProvider[0].cost).toBe("number");
    expect(data.lifetime.totalCost).toBeGreaterThan(0);
    expect(data.lifetime.totalTokens).toBe(6000);

    // Today data
    expect(data.today.totalTokens).toBe(2500);
    expect(data.today.totalCost).toBeGreaterThan(0);

    // Per-estate
    expect(data.byEstate).toHaveLength(2);
    expect(data.byEstate[0].estateAddress).toBe("123 Main St");
  });

  it("returns zeros for user with no triage history", async () => {
    await mockClerkUser("user_test123");

    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
    };

    const estatesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return estatesChain;
      return emptyChain;
    });

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.lifetime.totalTokens).toBe(0);
    expect(data.lifetime.totalCost).toBe(0);
    expect(data.lifetime.byProvider).toEqual([]);
    expect(data.today.totalTokens).toBe(0);
    expect(data.today.totalCost).toBe(0);
    expect(data.byEstate).toEqual([]);
  });
});
