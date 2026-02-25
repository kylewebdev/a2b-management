import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "../skeleton";

describe("Skeleton", () => {
  it("renders with default classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild!;
    expect(el).toHaveClass("animate-pulse", "rounded-md", "bg-surface-raised");
  });

  it("accepts additional className", () => {
    const { container } = render(<Skeleton className="h-7 w-32" />);
    const el = container.firstElementChild!;
    expect(el).toHaveClass("h-7", "w-32");
  });

  it("renders as a div element", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild!.tagName).toBe("DIV");
  });
});
