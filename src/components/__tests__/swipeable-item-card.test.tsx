import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SwipeableItemCard } from "../swipeable-item-card";

describe("SwipeableItemCard", () => {
  it("renders children", () => {
    render(
      <SwipeableItemCard itemId="item-1" onDisposition={vi.fn()}>
        <div>Test Content</div>
      </SwipeableItemCard>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("has data-testid", () => {
    render(
      <SwipeableItemCard itemId="item-1" onDisposition={vi.fn()}>
        <div>Test</div>
      </SwipeableItemCard>
    );
    expect(screen.getByTestId("swipeable-item-card")).toBeInTheDocument();
  });

  it("does not show actions initially", () => {
    render(
      <SwipeableItemCard itemId="item-1" onDisposition={vi.fn()}>
        <div>Test</div>
      </SwipeableItemCard>
    );
    expect(screen.queryByTestId("swipe-actions")).not.toBeInTheDocument();
  });

  it("shows actions after touch swipe past threshold", () => {
    render(
      <SwipeableItemCard itemId="item-1" onDisposition={vi.fn()}>
        <div data-testid="card-content">Test</div>
      </SwipeableItemCard>
    );
    const content = screen.getByTestId("card-content").parentElement!;

    fireEvent.pointerDown(content, { clientX: 0, pointerType: "touch" });
    fireEvent.pointerMove(content, { clientX: 100, pointerType: "touch" });
    fireEvent.pointerUp(content, { pointerType: "touch" });

    expect(screen.getByTestId("swipe-actions")).toBeInTheDocument();
  });

  it("calls onDisposition when action button clicked", () => {
    const onDisposition = vi.fn();
    render(
      <SwipeableItemCard itemId="item-1" onDisposition={onDisposition}>
        <div data-testid="card-content">Test</div>
      </SwipeableItemCard>
    );
    const content = screen.getByTestId("card-content").parentElement!;

    // Swipe to reveal actions
    fireEvent.pointerDown(content, { clientX: 0, pointerType: "touch" });
    fireEvent.pointerMove(content, { clientX: 100, pointerType: "touch" });
    fireEvent.pointerUp(content, { pointerType: "touch" });

    // Click first disposition button
    const buttons = screen.getByTestId("swipe-actions").querySelectorAll("button");
    fireEvent.click(buttons[0]);

    expect(onDisposition).toHaveBeenCalledWith("item-1", expect.any(String));
  });
});
