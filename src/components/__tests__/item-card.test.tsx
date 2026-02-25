import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemCard } from "../item-card";

const defaultProps = {
  id: "item-1",
  estateId: "estate-1",
  tier: null as "1" | "2" | "3" | "4" | null,
  status: "pending" as const,
  thumbnailUrl: "https://example.com/photo.jpg",
  aiIdentification: null as { title?: string } | null,
};

describe("ItemCard", () => {
  it("renders 'Awaiting triage' when no AI identification", () => {
    render(<ItemCard {...defaultProps} />);
    expect(screen.getByText("Awaiting triage")).toBeInTheDocument();
  });

  it("renders AI identification title when available", () => {
    render(
      <ItemCard
        {...defaultProps}
        aiIdentification={{ title: "Antique Writing Desk" }}
      />
    );
    expect(screen.getByText("Antique Writing Desk")).toBeInTheDocument();
  });

  it("renders tier badge as Pending when tier is null", () => {
    render(<ItemCard {...defaultProps} />);
    const pendingElements = screen.getAllByText("Pending");
    // TierBadge "Pending" + status label "Pending"
    expect(pendingElements.length).toBeGreaterThanOrEqual(1);
    expect(pendingElements[0]).toBeInTheDocument();
  });

  it("renders tier badge when tier is set", () => {
    render(<ItemCard {...defaultProps} tier="3" />);
    expect(screen.getByText("Tier 3")).toBeInTheDocument();
  });

  it("renders status label", () => {
    render(<ItemCard {...defaultProps} status="triaged" />);
    expect(screen.getByText("Triaged")).toBeInTheDocument();
  });

  it("renders thumbnail image when URL provided", () => {
    render(<ItemCard {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("renders placeholder when no thumbnail", () => {
    render(<ItemCard {...defaultProps} thumbnailUrl={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("links to item detail page", () => {
    render(<ItemCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/estates/estate-1/items/item-1");
  });
});
