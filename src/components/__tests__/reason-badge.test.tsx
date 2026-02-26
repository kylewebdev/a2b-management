import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReasonBadge } from "../reason-badge";

describe("ReasonBadge", () => {
  it("renders 'Needs Disposition' for awaiting_disposition", () => {
    render(<ReasonBadge reason="awaiting_disposition" />);
    expect(screen.getByText("Needs Disposition")).toBeInTheDocument();
  });

  it("renders 'Stale' for stale", () => {
    render(<ReasonBadge reason="stale" />);
    expect(screen.getByText("Stale")).toBeInTheDocument();
  });

  it("renders 'Low Confidence' for low_confidence", () => {
    render(<ReasonBadge reason="low_confidence" />);
    expect(screen.getByText("Low Confidence")).toBeInTheDocument();
  });

  it("applies amber classes for awaiting_disposition", () => {
    const { container } = render(<ReasonBadge reason="awaiting_disposition" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("text-tier-2");
    expect(badge.className).toContain("bg-tier-2/15");
  });

  it("applies red classes for stale", () => {
    const { container } = render(<ReasonBadge reason="stale" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("text-tier-4");
    expect(badge.className).toContain("bg-tier-4/15");
  });

  it("applies blue classes for low_confidence", () => {
    const { container } = render(<ReasonBadge reason="low_confidence" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("text-tier-3");
    expect(badge.className).toContain("bg-tier-3/15");
  });
});
