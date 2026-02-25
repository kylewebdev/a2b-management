import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateEstateForm } from "../create-estate-form";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

describe("CreateEstateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders all fields", () => {
    render(<CreateEstateForm />);
    expect(screen.getByLabelText(/^address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estate name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("shows validation error on empty submit (address required)", async () => {
    const user = userEvent.setup();
    render(<CreateEstateForm />);

    await user.click(screen.getByRole("button", { name: /create estate/i }));

    await waitFor(() => {
      expect(screen.getByText("Address is required")).toBeInTheDocument();
    });

    // Should not call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls fetch with valid data", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "uuid-new" }),
    });

    render(<CreateEstateForm />);

    await user.type(screen.getByLabelText(/estate name/i), "Test Estate");
    await user.type(screen.getByLabelText(/address/i), "123 Main St");
    await user.click(screen.getByRole("button", { name: /create estate/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/estates", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("redirects after successful creation", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "uuid-new" }),
    });

    render(<CreateEstateForm />);

    await user.type(screen.getByLabelText(/estate name/i), "Test Estate");
    await user.type(screen.getByLabelText(/address/i), "123 Main St");
    await user.click(screen.getByRole("button", { name: /create estate/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/estates/uuid-new");
    });
  });

  it("disables button while submitting", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((r) => { resolveFetch = r; }),
    );

    render(<CreateEstateForm />);

    await user.type(screen.getByLabelText(/estate name/i), "Test");
    await user.type(screen.getByLabelText(/address/i), "123 St");
    await user.click(screen.getByRole("button", { name: /create estate/i }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });

    // Resolve to clean up
    resolveFetch!({ ok: true, json: () => Promise.resolve({ id: "1" }) });
  });
});
