import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RoutingGuidance } from "../routing-guidance";
import { DispositionSelector } from "../disposition-selector";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
});

describe("RoutingGuidance", () => {
  it("is hidden when status is pending", () => {
    const { container } = render(
      <RoutingGuidance itemId="item-1" status="pending" tier="2" valuation={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows guidance text for tier 1", () => {
    render(
      <RoutingGuidance itemId="item-1" status="triaged" tier="1" valuation={null} />
    );
    expect(screen.getByText(/Tag and move on/)).toBeInTheDocument();
  });

  it("shows guidance text for tier 2 with valuation", () => {
    render(
      <RoutingGuidance
        itemId="item-1"
        status="triaged"
        tier="2"
        valuation={{ lowEstimate: 100, highEstimate: 300 }}
      />
    );
    expect(screen.getByText(/AI suggests: \$100 – \$300/)).toBeInTheDocument();
  });

  it("shows guidance for tier 4", () => {
    render(
      <RoutingGuidance itemId="item-1" status="triaged" tier="4" valuation={null} />
    );
    expect(screen.getByText(/Secure this item/)).toBeInTheDocument();
  });

  it("shows Acknowledge button when triaged", () => {
    render(
      <RoutingGuidance itemId="item-1" status="triaged" tier="2" valuation={null} />
    );
    expect(screen.getByRole("button", { name: /acknowledge/i })).toBeInTheDocument();
  });

  it("PATCHes status: routed on Acknowledge click", async () => {
    render(
      <RoutingGuidance itemId="item-1" status="triaged" tier="2" valuation={null} />
    );

    fireEvent.click(screen.getByRole("button", { name: /acknowledge/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/items/item-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "routed" }),
      }));
    });
  });

  it("shows 'Routing acknowledged' when routed", () => {
    render(
      <RoutingGuidance itemId="item-1" status="routed" tier="2" valuation={null} />
    );
    expect(screen.getByText(/Routing acknowledged/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it("shows 'Routing acknowledged' when resolved", () => {
    render(
      <RoutingGuidance itemId="item-1" status="resolved" tier="2" valuation={null} />
    );
    expect(screen.getByText(/Routing acknowledged/)).toBeInTheDocument();
  });
});

describe("DispositionSelector", () => {
  it("shows 'Triage required first' for pending items", () => {
    render(<DispositionSelector itemId="item-1" status="pending" disposition={null} />);
    expect(screen.getByText(/Triage required first/)).toBeInTheDocument();
  });

  it("renders 4 disposition buttons for triaged items", () => {
    render(<DispositionSelector itemId="item-1" status="triaged" disposition={null} />);
    expect(screen.getByRole("button", { name: /Sold Onsite/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bulk Lot/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Donated/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trashed/ })).toBeInTheDocument();
  });

  it("highlights current disposition", () => {
    render(<DispositionSelector itemId="item-1" status="resolved" disposition="donated" />);
    const btn = screen.getByRole("button", { name: /Donated/ });
    expect(btn.className).toMatch(/accent/);
  });

  it("PATCHes disposition on click", async () => {
    render(<DispositionSelector itemId="item-1" status="triaged" disposition={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Bulk Lot/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/items/item-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ disposition: "bulk_lot" }),
      }));
    });
  });
});
