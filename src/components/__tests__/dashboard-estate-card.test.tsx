import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardEstateCard } from "../dashboard-estate-card";

const defaultProps = {
  id: "estate-1",
  name: "Grandma's House",
  address: "123 Main St",
  status: "active" as const,
  itemCount: 10,
  pendingCount: 3,
  estimatedValueLow: 500,
  estimatedValueHigh: 2000,
  lastActivity: "2026-01-15T12:00:00Z",
};

describe("DashboardEstateCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders estate name as title when present", () => {
    render(<DashboardEstateCard {...defaultProps} />);
    expect(screen.getByText("Grandma's House")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("renders address as title when name is null", () => {
    render(<DashboardEstateCard {...defaultProps} name={null} />);
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<DashboardEstateCard {...defaultProps} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders item count", () => {
    render(<DashboardEstateCard {...defaultProps} />);
    expect(screen.getByText("10 items")).toBeInTheDocument();
  });

  it("renders singular item count", () => {
    render(<DashboardEstateCard {...defaultProps} itemCount={1} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("renders pending count when > 0", () => {
    render(<DashboardEstateCard {...defaultProps} />);
    expect(screen.getByText("3 pending")).toBeInTheDocument();
  });

  it("does not render pending count when 0", () => {
    render(<DashboardEstateCard {...defaultProps} pendingCount={0} />);
    expect(screen.queryByText(/pending/)).toBeNull();
  });

  it("renders estimated value range", () => {
    render(<DashboardEstateCard {...defaultProps} />);
    expect(screen.getByText("$500 – $2,000")).toBeInTheDocument();
  });

  it("renders -- when no value", () => {
    render(
      <DashboardEstateCard
        {...defaultProps}
        estimatedValueLow={0}
        estimatedValueHigh={0}
      />,
    );
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("renders relative time for last activity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T12:00:00Z"));
    render(<DashboardEstateCard {...defaultProps} />);
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  it("links to estate detail page", () => {
    render(<DashboardEstateCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/estates/estate-1");
  });
});
