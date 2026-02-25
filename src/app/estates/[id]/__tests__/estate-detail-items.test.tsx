import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstateDetail } from "../estate-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseEstate = {
  id: "estate-1",
  name: "Test Estate",
  address: "123 Main St",
  status: "active" as const,
  clientName: null,
  notes: null,
  itemCount: 0,
  createdAt: "2025-01-15T10:00:00Z",
};

const mockItem = {
  id: "item-1",
  estateId: "estate-1",
  tier: "2" as const,
  status: "triaged" as const,
  thumbnailUrl: "https://example.com/thumb.jpg",
  aiIdentification: { title: "Antique Writing Desk" },
};

describe("EstateDetail items integration", () => {
  it("renders empty state when no items", () => {
    render(<EstateDetail estate={baseEstate} items={[]} />);
    expect(screen.getByText("No items yet. Grab your camera.")).toBeInTheDocument();
  });

  it("renders Upload Photos CTA for active estates", () => {
    render(<EstateDetail estate={baseEstate} />);
    const link = screen.getByRole("link", { name: /Upload Photos/ });
    expect(link).toHaveAttribute("href", "/estates/estate-1/upload");
  });

  it("hides Upload Photos CTA for closed estates", () => {
    render(
      <EstateDetail estate={{ ...baseEstate, status: "closed" }} items={[]} />
    );
    expect(screen.queryByText("Upload Photos")).not.toBeInTheDocument();
  });

  it("renders item cards when items exist", () => {
    render(<EstateDetail estate={{ ...baseEstate, itemCount: 1 }} items={[mockItem]} />);
    expect(screen.getByText("Antique Writing Desk")).toBeInTheDocument();
    expect(screen.getByText("Tier 2")).toBeInTheDocument();
  });

  it("renders item card links to item detail page", () => {
    render(<EstateDetail estate={{ ...baseEstate, itemCount: 1 }} items={[mockItem]} />);
    const links = screen.getAllByRole("link");
    const itemLink = links.find((l) => l.getAttribute("href")?.includes("/items/"));
    expect(itemLink).toHaveAttribute("href", "/estates/estate-1/items/item-1");
  });

  it("renders multiple item cards", () => {
    const items = [
      mockItem,
      { ...mockItem, id: "item-2", aiIdentification: { title: "Vintage Lamp" } },
    ];
    render(<EstateDetail estate={{ ...baseEstate, itemCount: 2 }} items={items} />);
    expect(screen.getByText("Antique Writing Desk")).toBeInTheDocument();
    expect(screen.getByText("Vintage Lamp")).toBeInTheDocument();
  });
});
