import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "../dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const emptyStats = {
  activeEstates: 0,
  itemsPendingTriage: 0,
  itemsPendingDisposition: 0,
  totalEstimatedValueLow: 0,
  totalEstimatedValueHigh: 0,
};

describe("Empty States", () => {
  it("renders New Estate CTA in dashboard empty state", () => {
    render(
      <Dashboard
        stats={emptyStats}
        attentionEstates={[]}
        rankedEstates={[]}
      />,
    );
    const links = screen.getAllByRole("link", { name: /New Estate/ });
    // Header CTA + empty state CTA
    expect(links.length).toBe(2);
    expect(links.every((l) => l.getAttribute("href") === "/estates/new")).toBe(
      true,
    );
  });

  it("renders empty state message in dashboard", () => {
    render(
      <Dashboard
        stats={emptyStats}
        attentionEstates={[]}
        rankedEstates={[]}
      />,
    );
    expect(screen.getByText(/No active estates/)).toBeInTheDocument();
  });
});
