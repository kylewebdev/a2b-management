import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EstateSummaryPanel } from "../estate-summary";
import { ItemFilters } from "../item-filters";
import type { EstateSummary } from "@/lib/estate-summary";

const emptySummary: EstateSummary = {
  tierBreakdown: { "1": 0, "2": 0, "3": 0, "4": 0, untiered: 0 },
  statusBreakdown: { pending: 0, triaged: 0, routed: 0, resolved: 0 },
  totalEstimatedValueLow: 0,
  totalEstimatedValueHigh: 0,
  unresolvedCount: 0,
  totalCount: 0,
};

const sampleSummary: EstateSummary = {
  tierBreakdown: { "1": 5, "2": 3, "3": 2, "4": 1, untiered: 1 },
  statusBreakdown: { pending: 2, triaged: 3, routed: 2, resolved: 5 },
  totalEstimatedValueLow: 1500,
  totalEstimatedValueHigh: 4200,
  unresolvedCount: 7,
  totalCount: 12,
};

describe("EstateSummaryPanel", () => {
  it("renders nothing when totalCount is 0", () => {
    const { container } = render(<EstateSummaryPanel summary={emptySummary} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders tier breakdown pills", () => {
    render(<EstateSummaryPanel summary={sampleSummary} />);
    expect(screen.getByText("T1: 5")).toBeInTheDocument();
    expect(screen.getByText("T2: 3")).toBeInTheDocument();
    expect(screen.getByText("T3: 2")).toBeInTheDocument();
    expect(screen.getByText("T4: 1")).toBeInTheDocument();
  });

  it("renders total estimated value range", () => {
    render(<EstateSummaryPanel summary={sampleSummary} />);
    expect(screen.getByText(/\$1,500/)).toBeInTheDocument();
    expect(screen.getByText(/\$4,200/)).toBeInTheDocument();
  });

  it("renders unresolved count", () => {
    render(<EstateSummaryPanel summary={sampleSummary} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/unresolved/i)).toBeInTheDocument();
  });

  it("renders status breakdown", () => {
    render(<EstateSummaryPanel summary={sampleSummary} />);
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
    expect(screen.getByText(/Triaged/)).toBeInTheDocument();
    expect(screen.getByText(/Resolved/)).toBeInTheDocument();
  });
});

describe("ItemFilters", () => {
  const noop = () => {};

  it("renders All button for tier filter", () => {
    render(
      <ItemFilters
        tierFilter={null}
        statusFilter={null}
        onTierChange={noop}
        onStatusChange={noop}
      />
    );
    const allButtons = screen.getAllByRole("button", { name: "All" });
    expect(allButtons.length).toBe(2);
  });

  it("renders tier filter buttons", () => {
    render(
      <ItemFilters
        tierFilter={null}
        statusFilter={null}
        onTierChange={noop}
        onStatusChange={noop}
      />
    );
    expect(screen.getByRole("button", { name: "T1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "T2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "T3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "T4" })).toBeInTheDocument();
  });

  it("renders status filter buttons", () => {
    render(
      <ItemFilters
        tierFilter={null}
        statusFilter={null}
        onTierChange={noop}
        onStatusChange={noop}
      />
    );
    expect(screen.getByRole("button", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Triaged" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Routed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolved" })).toBeInTheDocument();
  });

  it("calls onTierChange when tier button clicked", () => {
    const onTierChange = vi.fn();
    render(
      <ItemFilters
        tierFilter={null}
        statusFilter={null}
        onTierChange={onTierChange}
        onStatusChange={noop}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "T3" }));
    expect(onTierChange).toHaveBeenCalledWith("3");
  });

  it("calls onTierChange with null when All clicked", () => {
    const onTierChange = vi.fn();
    render(
      <ItemFilters
        tierFilter="2"
        statusFilter={null}
        onTierChange={onTierChange}
        onStatusChange={noop}
      />
    );
    const allButtons = screen.getAllByRole("button", { name: "All" });
    fireEvent.click(allButtons[0]); // First "All" is tier filter
    expect(onTierChange).toHaveBeenCalledWith(null);
  });

  it("calls onStatusChange when status button clicked", () => {
    const onStatusChange = vi.fn();
    render(
      <ItemFilters
        tierFilter={null}
        statusFilter={null}
        onTierChange={noop}
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Resolved" }));
    expect(onStatusChange).toHaveBeenCalledWith("resolved");
  });

  it("highlights active tier filter", () => {
    render(
      <ItemFilters
        tierFilter="2"
        statusFilter={null}
        onTierChange={noop}
        onStatusChange={noop}
      />
    );
    const btn = screen.getByRole("button", { name: "T2" });
    expect(btn.className).toMatch(/accent/);
  });

  it("highlights active status filter", () => {
    render(
      <ItemFilters
        tierFilter={null}
        statusFilter="pending"
        onTierChange={noop}
        onStatusChange={noop}
      />
    );
    const btn = screen.getByRole("button", { name: "Pending" });
    expect(btn.className).toMatch(/accent/);
  });
});
