import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttentionCard } from "../attention-card";

const defaultProps = {
  id: "estate-1",
  name: "Grandma's House",
  address: "123 Main St",
  reason: "awaiting_disposition" as const,
  reasonDetail: "3 items awaiting disposition",
  itemCount: 5,
};

describe("AttentionCard", () => {
  it("renders estate name as title when present", () => {
    render(<AttentionCard {...defaultProps} />);
    expect(screen.getByText("Grandma's House")).toBeInTheDocument();
  });

  it("renders address as title when name is null", () => {
    render(<AttentionCard {...defaultProps} name={null} />);
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("renders reason badge", () => {
    render(<AttentionCard {...defaultProps} />);
    expect(screen.getByText("Needs Disposition")).toBeInTheDocument();
  });

  it("renders reason detail text", () => {
    render(<AttentionCard {...defaultProps} />);
    expect(
      screen.getByText("3 items awaiting disposition"),
    ).toBeInTheDocument();
  });

  it("renders item count (plural)", () => {
    render(<AttentionCard {...defaultProps} />);
    expect(screen.getByText("5 items")).toBeInTheDocument();
  });

  it("renders item count (singular)", () => {
    render(<AttentionCard {...defaultProps} itemCount={1} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("links to estate detail page", () => {
    render(<AttentionCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/estates/estate-1");
  });

  it("renders stale reason badge", () => {
    render(
      <AttentionCard
        {...defaultProps}
        reason="stale"
        reasonDetail="No activity for 7+ days"
      />,
    );
    expect(screen.getByText("Stale")).toBeInTheDocument();
    expect(screen.getByText("No activity for 7+ days")).toBeInTheDocument();
  });
});
