import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UsageDashboard } from "../usage-dashboard";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockUsageResponse(overrides = {}) {
  return {
    lifetime: {
      totalTokens: 15000,
      totalCost: 0.12,
      triageCount: 5,
      byProvider: [
        {
          provider: "anthropic/claude-sonnet-4-20250514",
          inputTokens: 12000,
          outputTokens: 3000,
          totalTokens: 15000,
          triageCount: 5,
          cost: 0.12,
        },
      ],
    },
    today: {
      totalTokens: 5000,
      totalCost: 0.04,
      triageCount: 2,
    },
    byEstate: [
      {
        estateId: "estate-1",
        estateAddress: "123 Main St",
        provider: "anthropic/claude-sonnet-4-20250514",
        inputTokens: 8000,
        outputTokens: 2000,
        totalTokens: 10000,
        triageCount: 3,
        cost: 0.08,
      },
      {
        estateId: "estate-2",
        estateAddress: "456 Oak Ave",
        provider: "anthropic/claude-sonnet-4-20250514",
        inputTokens: 4000,
        outputTokens: 1000,
        totalTokens: 5000,
        triageCount: 2,
        cost: 0.04,
      },
    ],
    ...overrides,
  };
}

describe("UsageDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    render(<UsageDashboard />);
    expect(screen.getByTestId("usage-loading")).toBeInTheDocument();
  });

  it("renders usage data with totals", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse()),
    });

    render(<UsageDashboard />);

    await waitFor(() => {
      expect(screen.getByText("15,000")).toBeInTheDocument(); // total tokens
    });

    expect(screen.getByText("$0.12")).toBeInTheDocument(); // total cost
    expect(screen.getByText("5")).toBeInTheDocument(); // triage count
  });

  it("renders today's usage", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse()),
    });

    render(<UsageDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    // Today cost ($0.04) appears in both today section and per-estate table
    expect(screen.getAllByText("$0.04")).toHaveLength(2);
    // Today tokens (5,000) also appears in both
    expect(screen.getAllByText("5,000")).toHaveLength(2);
  });

  it("renders per-estate breakdown table", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse()),
    });

    render(<UsageDashboard />);

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    expect(screen.getByText("456 Oak Ave")).toBeInTheDocument();
  });

  it("shows empty state when no triage activity", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          mockUsageResponse({
            lifetime: { totalTokens: 0, totalCost: 0, triageCount: 0, byProvider: [] },
            today: { totalTokens: 0, totalCost: 0, triageCount: 0 },
            byEstate: [],
          })
        ),
    });

    render(<UsageDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no triage activity yet/i)).toBeInTheDocument();
    });
  });

  it("shows cost warning banner when threshold exceeded", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          mockUsageResponse({
            lifetime: {
              totalTokens: 500000,
              totalCost: 55.0,
              triageCount: 100,
              byProvider: [
                {
                  provider: "anthropic/claude-opus-4-20250514",
                  inputTokens: 400000,
                  outputTokens: 100000,
                  totalTokens: 500000,
                  triageCount: 100,
                  cost: 55.0,
                },
              ],
            },
          })
        ),
    });

    render(<UsageDashboard costWarningThreshold={50} />);

    await waitFor(() => {
      expect(screen.getByText(/spending has exceeded/i)).toBeInTheDocument();
    });
  });

  it("does not show cost warning when under threshold", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse()),
    });

    render(<UsageDashboard costWarningThreshold={50} />);

    await waitFor(() => {
      expect(screen.getByText("15,000")).toBeInTheDocument();
    });

    expect(screen.queryByText(/spending has exceeded/i)).not.toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<UsageDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load usage/i)).toBeInTheDocument();
    });
  });
});
