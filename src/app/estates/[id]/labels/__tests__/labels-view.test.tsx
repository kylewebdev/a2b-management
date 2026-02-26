import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LabelsView } from "../labels-view";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockQR"),
  },
}));

const mockItems = [
  {
    id: "item-1",
    estateId: "estate-1",
    tier: "2" as const,
    status: "triaged" as const,
    salePrice: 75,
  },
  {
    id: "item-2",
    estateId: "estate-1",
    tier: "3" as const,
    status: "routed" as const,
    salePrice: null,
  },
  {
    id: "item-3",
    estateId: "estate-1",
    tier: "1" as const,
    status: "triaged" as const,
    salePrice: 10,
  },
];

describe("LabelsView", () => {
  it("renders all item labels", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    const labels = screen.getAllByTestId("item-label");
    expect(labels).toHaveLength(3);
  });

  it("shows item count in header", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    expect(screen.getByText(/3 labels/)).toBeInTheDocument();
  });

  it("shows estate name in header", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
  });

  it("renders empty state when no items", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={[]} />
    );
    expect(screen.getByText("No items ready for labels.")).toBeInTheDocument();
  });

  it("disables print button when no items", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={[]} />
    );
    expect(screen.getByRole("button", { name: /Print Labels/ })).toBeDisabled();
  });

  it("filters by tier when tier button clicked", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    fireEvent.click(screen.getByRole("button", { name: "T3" }));
    const labels = screen.getAllByTestId("item-label");
    expect(labels).toHaveLength(1);
  });

  it("shows all items when All filter clicked after filtering", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    fireEvent.click(screen.getByRole("button", { name: "T3" }));
    // The "All" button in tier-filters — need to find the first one
    const allButtons = screen.getAllByRole("button", { name: "All" });
    fireEvent.click(allButtons[0]);
    const labels = screen.getAllByTestId("item-label");
    expect(labels).toHaveLength(3);
  });

  it("updates label count when filtering", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    fireEvent.click(screen.getByRole("button", { name: "T2" }));
    expect(screen.getByText(/1 label for/)).toBeInTheDocument();
  });

  it("renders back link to estate", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    const backLink = screen.getByRole("link", { name: /Back to estate/ });
    expect(backLink).toHaveAttribute("href", "/estates/estate-1");
  });

  it("renders labels grid container", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    expect(screen.getByTestId("labels-grid")).toBeInTheDocument();
  });

  it("calls window.print when print button clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Print Labels/ }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("shows 'See Cashier' for items without sale price", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    expect(screen.getByText("See Cashier")).toBeInTheDocument();
  });

  it("shows sale price for items with price set", () => {
    render(
      <LabelsView estateId="estate-1" estateName="123 Main St" items={mockItems} />
    );
    expect(screen.getByText("$75")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
  });
});
