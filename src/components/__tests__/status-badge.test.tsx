import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("renders Active for active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Resolving for resolving status", () => {
    render(<StatusBadge status="resolving" />);
    expect(screen.getByText("Resolving")).toBeInTheDocument();
  });

  it("renders Closed for closed status", () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("applies accent classes for active", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("text-accent");
    expect(badge.className).toContain("bg-accent-muted");
  });

  it("applies tier-2 classes for resolving", () => {
    const { container } = render(<StatusBadge status="resolving" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("text-tier-2");
  });

  it("applies muted classes for closed", () => {
    const { container } = render(<StatusBadge status="closed" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("text-text-muted");
  });
});
