import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "../dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("Empty States", () => {
  it("renders New Estate CTA in dashboard empty state", () => {
    render(<Dashboard estates={[]} />);
    const links = screen.getAllByRole("link", { name: /New Estate/ });
    // Header CTA + empty state CTA
    expect(links.length).toBe(2);
    expect(links.every((l) => l.getAttribute("href") === "/estates/new")).toBe(true);
  });

  it("renders empty state message in dashboard", () => {
    render(<Dashboard estates={[]} />);
    expect(screen.getByText(/No active estates/)).toBeInTheDocument();
  });
});
