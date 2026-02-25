import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstateList } from "../estate-list";

const mockEstates = [
  {
    id: "uuid-1",
    name: "Grandma's House",
    address: "123 Main St",
    status: "active" as const,
    itemCount: 5,
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "uuid-2",
    name: "Uncle Bob's Place",
    address: "456 Oak Ave",
    status: "resolving" as const,
    itemCount: 0,
    createdAt: "2025-02-01T10:00:00Z",
  },
];

describe("EstateList", () => {
  it("renders estate cards", () => {
    render(<EstateList estates={mockEstates} />);
    expect(screen.getByText("Grandma's House")).toBeInTheDocument();
    expect(screen.getByText("Uncle Bob's Place")).toBeInTheDocument();
  });

  it("shows empty state when no estates", () => {
    render(<EstateList estates={[]} />);
    expect(screen.getByText("No estates yet. Time to start digging.")).toBeInTheDocument();
  });

  it("shows New Estate CTA in empty state", () => {
    render(<EstateList estates={[]} />);
    const link = screen.getByRole("link", { name: /new estate/i });
    expect(link).toHaveAttribute("href", "/estates/new");
  });

  it("shows header with New Estate button when populated", () => {
    render(<EstateList estates={mockEstates} />);
    expect(screen.getByText("Estates")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /new estate/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("displays correct status badges", () => {
    render(<EstateList estates={mockEstates} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Resolving")).toBeInTheDocument();
  });
});
