import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Override the global mock from setup.ts so we test the real implementation
vi.unmock("@/components/toast");

import { ToastProvider, useToast, ToastContainer } from "../index";

function TestTrigger({ type = "success" as const, message = "Test toast", action }: {
  type?: "success" | "error" | "info";
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast({ message, type, action })}>
      Add Toast
    </button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
}

describe("Toast System", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("renders a toast when addToast is called", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TestTrigger message="Hello world" />);

    await user.click(screen.getByText("Add Toast"));

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders toast with correct type styling", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TestTrigger type="error" message="Error occurred" />);

    await user.click(screen.getByText("Add Toast"));

    const toast = screen.getByText("Error occurred").closest("[role='status']");
    expect(toast).toHaveClass("border-red-400");
  });

  it("auto-dismisses after 4 seconds", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TestTrigger message="Disappearing" />);

    await user.click(screen.getByText("Add Toast"));
    expect(screen.getByText("Disappearing")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByText("Disappearing")).not.toBeInTheDocument();
  });

  it("limits to 3 toasts maximum", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TestTrigger message="Toast" />);

    const btn = screen.getByText("Add Toast");
    for (let i = 0; i < 5; i++) {
      await user.click(btn);
    }

    const toasts = screen.getAllByRole("status");
    expect(toasts).toHaveLength(3);
  });

  it("calls action callback when action button is clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(
      <TestTrigger message="With action" action={{ label: "Undo", onClick }} />
    );

    await user.click(screen.getByText("Add Toast"));
    await user.click(screen.getByText("Undo"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("removes toast when close button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TestTrigger message="Close me" />);

    await user.click(screen.getByText("Add Toast"));
    expect(screen.getByText("Close me")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("Close me")).not.toBeInTheDocument();
  });

  it("renders nothing when no toasts exist", () => {
    const { container } = render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>
    );
    expect(container.querySelector("[aria-live]")).not.toBeInTheDocument();
  });

  it("throws when useToast is called outside provider", () => {
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow("useToast must be used within ToastProvider");
  });
});
