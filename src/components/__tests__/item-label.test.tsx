import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ItemLabel } from "../item-label";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockQR"),
  },
}));

const defaultProps = {
  itemId: "item-uuid-123",
  estateId: "estate-uuid-456",
  salePrice: 75 as number | null,
  baseUrl: "https://app.example.com",
};

describe("ItemLabel", () => {
  it("renders sale price when set", () => {
    render(<ItemLabel {...defaultProps} />);
    expect(screen.getByTestId("label-price")).toHaveTextContent("$75");
  });

  it("renders 'See Cashier' when no sale price", () => {
    render(<ItemLabel {...defaultProps} salePrice={null} />);
    expect(screen.getByTestId("label-price")).toHaveTextContent("See Cashier");
  });

  it("formats price with comma for large amounts", () => {
    render(<ItemLabel {...defaultProps} salePrice={1500} />);
    expect(screen.getByTestId("label-price")).toHaveTextContent("$1,500");
  });

  it("renders QR code image after generation", async () => {
    render(<ItemLabel {...defaultProps} />);
    await waitFor(() => {
      const img = screen.getByTestId("label-qr");
      expect(img).toHaveAttribute("src", "data:image/png;base64,mockQR");
    });
  });

  it("encodes correct URL in QR code", async () => {
    const QRCode = await import("qrcode");
    render(<ItemLabel {...defaultProps} />);
    await waitFor(() => {
      expect(QRCode.default.toDataURL).toHaveBeenCalledWith(
        "https://app.example.com/estates/estate-uuid-456/items/item-uuid-123",
        expect.any(Object)
      );
    });
  });

  it("renders label container with data-testid", () => {
    render(<ItemLabel {...defaultProps} />);
    expect(screen.getByTestId("item-label")).toBeInTheDocument();
  });

  it("renders QR placeholder before generation", async () => {
    const QRCode = await import("qrcode");
    vi.mocked(QRCode.default.toDataURL).mockReturnValueOnce(new Promise(() => {}));
    render(<ItemLabel {...defaultProps} />);
    expect(screen.queryByTestId("label-qr")).not.toBeInTheDocument();
  });

  it("renders $0 price correctly", () => {
    render(<ItemLabel {...defaultProps} salePrice={0} />);
    expect(screen.getByTestId("label-price")).toHaveTextContent("$0");
  });
});
