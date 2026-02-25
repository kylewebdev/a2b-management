import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TriageDisplay } from "../triage-display";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock the triage stream hook
const mockStartTriage = vi.fn();
const mockHookReturn = {
  state: "idle" as string,
  streamText: "",
  result: null as unknown,
  usage: null,
  error: null as string | null,
  startTriage: mockStartTriage,
};

vi.mock("@/lib/hooks/use-triage-stream", () => ({
  useTriageStream: () => mockHookReturn,
}));

describe("TriageDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.state = "idle";
    mockHookReturn.streamText = "";
    mockHookReturn.result = null;
    mockHookReturn.error = null;
  });

  it("shows Triage button for pending items", () => {
    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    const btn = screen.getByTestId("triage-button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Triage");
  });

  it("triage button triggers startTriage", () => {
    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    fireEvent.click(screen.getByTestId("triage-button"));
    expect(mockStartTriage).toHaveBeenCalled();
  });

  it("shows loading state when starting", () => {
    mockHookReturn.state = "starting";

    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    expect(screen.getByTestId("triage-starting")).toBeInTheDocument();
    expect(screen.getByText("Preparing triage...")).toBeInTheDocument();
  });

  it("shows streaming text area with live response", () => {
    mockHookReturn.state = "streaming";
    mockHookReturn.streamText = '{"tier": "2", "identification":';

    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    const streamArea = screen.getByTestId("triage-streaming");
    expect(streamArea).toBeInTheDocument();
    expect(streamArea).toHaveTextContent('{"tier": "2", "identification":');
  });

  it("shows error message with retry button", () => {
    mockHookReturn.state = "error";
    mockHookReturn.error = "Rate limit exceeded";

    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    expect(screen.getByTestId("triage-error")).toBeInTheDocument();
    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    expect(screen.getByTestId("retry-button")).toBeInTheDocument();
  });

  it("retry button triggers startTriage again", () => {
    mockHookReturn.state = "error";
    mockHookReturn.error = "Failed";

    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    fireEvent.click(screen.getByTestId("retry-button"));
    expect(mockStartTriage).toHaveBeenCalled();
  });

  it("shows structured result when complete", async () => {
    mockHookReturn.state = "complete";
    mockHookReturn.result = {
      identification: { title: "Roseville Vase", description: "Art pottery" },
      tier: "3",
      confidence: "high",
      valuation: { lowEstimate: 120, highEstimate: 180, currency: "USD" },
    };

    render(<TriageDisplay itemId="item-1" itemStatus="pending" />);

    await waitFor(() => {
      expect(screen.getByTestId("triage-result")).toBeInTheDocument();
    });
    // Hero card shows tier + value
    expect(screen.getByTestId("hero-card")).toBeInTheDocument();
    expect(screen.getByText(/\$120/)).toBeInTheDocument();
    expect(screen.getByText(/\$180/)).toBeInTheDocument();
    expect(screen.getByText("high confidence")).toBeInTheDocument();
    // AI details section shows identification
    expect(screen.getByTestId("ai-details")).toBeInTheDocument();
    expect(screen.getByText("Roseville Vase")).toBeInTheDocument();
    expect(screen.getByText("Art pottery")).toBeInTheDocument();
  });

  it("shows existing result for already-triaged items", () => {
    render(
      <TriageDisplay
        itemId="item-1"
        itemStatus="triaged"
        existingResult={{
          tier: "2",
          aiIdentification: { title: "Old Desk", description: "A wooden desk" },
          aiValuation: { lowEstimate: 30, highEstimate: 60, confidence: "medium" },
        }}
      />
    );

    expect(screen.getByTestId("triage-result")).toBeInTheDocument();
    expect(screen.getByTestId("hero-card")).toBeInTheDocument();
    expect(screen.getByText("Old Desk")).toBeInTheDocument();
    expect(screen.getByText("medium confidence")).toBeInTheDocument();
  });

  it("shows listing guidance for tier 3+ items", () => {
    render(
      <TriageDisplay
        itemId="item-1"
        itemStatus="triaged"
        existingResult={{
          tier: "3",
          aiIdentification: { title: "Rare Vase" },
          aiValuation: {
            lowEstimate: 200,
            highEstimate: 400,
            listingGuidance: {
              platforms: ["eBay"],
              keywords: ["rare", "vase", "vintage"],
              description: "Vintage rare vase in excellent condition.",
            },
          },
        }}
      />
    );

    expect(screen.getByTestId("listing-guidance")).toBeInTheDocument();
    // Platforms rendered as pill badges
    expect(screen.getByText("eBay")).toBeInTheDocument();
    // Keywords rendered as individual pill badges
    expect(screen.getByText("rare")).toBeInTheDocument();
    expect(screen.getByText("vase")).toBeInTheDocument();
    expect(screen.getByText("vintage")).toBeInTheDocument();
  });

  it("shows additional photos requested section", () => {
    render(
      <TriageDisplay
        itemId="item-1"
        itemStatus="triaged"
        existingResult={{
          tier: "2",
          aiIdentification: { title: "Mystery Item" },
          aiValuation: {
            lowEstimate: 10,
            highEstimate: 50,
            additionalPhotosRequested: ["Photo of bottom/marks", "Close-up of signature"],
          },
        }}
      />
    );

    expect(screen.getByTestId("additional-photos")).toBeInTheDocument();
    expect(screen.getByText("Photo of bottom/marks")).toBeInTheDocument();
    expect(screen.getByText("Close-up of signature")).toBeInTheDocument();
  });
});
