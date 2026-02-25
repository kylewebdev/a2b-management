import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemDetail } from "../item-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock TriageDisplay since it's tested separately
vi.mock("../triage-display", () => ({
  TriageDisplay: ({ itemStatus }: { itemStatus: string }) => (
    <div data-testid="triage-display">Triage: {itemStatus}</div>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const baseItem = {
  id: "item-1",
  estateId: "estate-1",
  tier: null as "1" | "2" | "3" | "4" | null,
  status: "pending" as const,
  notes: null,
  disposition: null,
  aiIdentification: null,
  aiValuation: null,
  photos: [
    { id: "p1", url: "https://example.com/photo1.jpg", originalFilename: "photo1.jpg" },
    { id: "p2", url: "https://example.com/photo2.jpg", originalFilename: "photo2.jpg" },
  ],
};

describe("ItemDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders photo gallery with main image", () => {
    render(<ItemDetail item={baseItem} />);
    const img = screen.getByAltText("photo1.jpg");
    expect(img).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("renders thumbnail strip for multiple photos", () => {
    render(<ItemDetail item={baseItem} />);
    expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
    expect(screen.getByAltText("Photo 1")).toBeInTheDocument();
    expect(screen.getByAltText("Photo 2")).toBeInTheDocument();
  });

  it("hides thumbnail strip for single photo", () => {
    render(
      <ItemDetail
        item={{ ...baseItem, photos: [baseItem.photos[0]] }}
      />
    );
    expect(screen.queryByTestId("thumbnail-strip")).not.toBeInTheDocument();
  });

  it("renders TriageDisplay component", () => {
    render(<ItemDetail item={baseItem} />);
    expect(screen.getByTestId("triage-display")).toBeInTheDocument();
    expect(screen.getByText("Triage: pending")).toBeInTheDocument();
  });

  it("passes triaged status to TriageDisplay", () => {
    render(
      <ItemDetail
        item={{
          ...baseItem,
          status: "triaged",
          tier: "3",
          aiIdentification: { title: "Mahogany Desk", description: "19th century" },
        }}
      />
    );
    expect(screen.getByText("Triage: triaged")).toBeInTheDocument();
  });

  it("renders disposition placeholder when not set", () => {
    render(<ItemDetail item={baseItem} />);
    expect(screen.getByText("Not yet decided")).toBeInTheDocument();
  });

  it("delegates tier display to TriageDisplay (no badges row)", () => {
    render(<ItemDetail item={{ ...baseItem, tier: "3", status: "triaged" }} />);
    // Tier badge no longer rendered directly — owned by TriageDisplay
    expect(screen.getByTestId("triage-display")).toBeInTheDocument();
  });

  it("renders back-to-estate link", () => {
    render(<ItemDetail item={baseItem} />);
    const link = screen.getByRole("link", { name: /Back to estate/ });
    expect(link).toHaveAttribute("href", "/estates/estate-1");
  });

  it("shows save button when notes are changed", async () => {
    const user = userEvent.setup();
    render(<ItemDetail item={baseItem} />);

    const textarea = screen.getByPlaceholderText("Add notes about this item...");
    await user.type(textarea, "New note");

    expect(screen.getByRole("button", { name: /Save Notes/ })).toBeInTheDocument();
  });

  it("saves notes on button click", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(<ItemDetail item={baseItem} />);

    const textarea = screen.getByPlaceholderText("Add notes about this item...");
    await user.type(textarea, "Test note");
    await user.click(screen.getByRole("button", { name: /Save Notes/ }));

    expect(mockFetch).toHaveBeenCalledWith("/api/items/item-1", expect.objectContaining({
      method: "PATCH",
    }));
  });
});
