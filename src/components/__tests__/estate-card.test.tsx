import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstateCard } from "../estate-card";

const defaultProps = {
  id: "uuid-1",
  name: "Grandma's House",
  address: "123 Main St",
  status: "active" as const,
  itemCount: 5,
  createdAt: "2025-01-15T10:00:00Z",
};

describe("EstateCard", () => {
  it("renders estate name as title when present", () => {
    render(<EstateCard {...defaultProps} />);
    expect(screen.getByText("Grandma's House")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("renders address as title when name is null", () => {
    render(<EstateCard {...defaultProps} name={null} />);
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<EstateCard {...defaultProps} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders item count (plural)", () => {
    render(<EstateCard {...defaultProps} />);
    expect(screen.getByText("5 items")).toBeInTheDocument();
  });

  it("renders item count (singular)", () => {
    render(<EstateCard {...defaultProps} itemCount={1} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("links to estate detail page", () => {
    render(<EstateCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/estates/uuid-1");
  });

  it("renders formatted date", () => {
    render(<EstateCard {...defaultProps} />);
    expect(screen.getByText("Jan 15, 2025")).toBeInTheDocument();
  });
});
