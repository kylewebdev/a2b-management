import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierBadge } from "../tier-badge";

describe("TierBadge", () => {
  it("renders 'Pending' for null tier", () => {
    render(<TierBadge tier={null} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders 'Tier 1' for tier 1", () => {
    render(<TierBadge tier="1" />);
    expect(screen.getByText("Tier 1")).toBeInTheDocument();
  });

  it("renders 'Tier 2' for tier 2", () => {
    render(<TierBadge tier="2" />);
    expect(screen.getByText("Tier 2")).toBeInTheDocument();
  });

  it("renders 'Tier 3' for tier 3", () => {
    render(<TierBadge tier="3" />);
    expect(screen.getByText("Tier 3")).toBeInTheDocument();
  });

  it("renders 'Tier 4' for tier 4", () => {
    render(<TierBadge tier="4" />);
    expect(screen.getByText("Tier 4")).toBeInTheDocument();
  });
});
