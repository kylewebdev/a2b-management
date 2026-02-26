import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BatchTriage } from "../batch-triage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockSSEResponse(success = true) {
  const text = success
    ? "data: {\"type\":\"chunk\"}\n\nevent: complete\ndata: {}\n\n"
    : "event: error\ndata: {\"error\":\"failed\"}\n\n";
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    }),
  };
}

describe("BatchTriage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows batch triage button with pending count", () => {
    render(<BatchTriage estateId="estate-1" pendingItemIds={["item-1", "item-2", "item-3"]} />);

    const btn = screen.getByTestId("batch-triage-button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Triage All (3)");
  });

  it("renders nothing when no pending items", () => {
    const { container } = render(<BatchTriage estateId="estate-1" pendingItemIds={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows progress during batch processing", async () => {
    // POST succeeds, then SSE stream resolves
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: "accepted" }) })
      .mockResolvedValueOnce(createMockSSEResponse(true));

    render(<BatchTriage estateId="estate-1" pendingItemIds={["item-1"]} />);

    fireEvent.click(screen.getByTestId("batch-triage-button"));

    await waitFor(() => {
      expect(screen.getByTestId("batch-triage-progress") || screen.getByTestId("batch-triage-complete")).toBeInTheDocument();
    });
  });

  it("shows completion summary on success", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(true))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(true));

    render(<BatchTriage estateId="estate-1" pendingItemIds={["item-1", "item-2"]} />);

    fireEvent.click(screen.getByTestId("batch-triage-button"));

    await waitFor(() => {
      expect(screen.getByTestId("batch-triage-complete")).toBeInTheDocument();
    });
    expect(screen.getByText("All 2 items triaged")).toBeInTheDocument();
  });

  it("continues to next item on failure", async () => {
    // First item fails POST, second succeeds
    mockFetch
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "No photos" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(true));

    render(<BatchTriage estateId="estate-1" pendingItemIds={["item-1", "item-2"]} />);

    fireEvent.click(screen.getByTestId("batch-triage-button"));

    await waitFor(() => {
      expect(screen.getByTestId("batch-triage-complete")).toBeInTheDocument();
    });
    expect(screen.getByText("1 triaged, 1 failed")).toBeInTheDocument();
  });

  it("handles SSE stream errors", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(false));

    render(<BatchTriage estateId="estate-1" pendingItemIds={["item-1"]} />);

    fireEvent.click(screen.getByTestId("batch-triage-button"));

    await waitFor(() => {
      expect(screen.getByTestId("batch-triage-complete")).toBeInTheDocument();
    });
    expect(screen.getByText("0 triaged, 1 failed")).toBeInTheDocument();
  });

  it("calls multiple POST+SSE pairs for batch", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(true))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(true))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(createMockSSEResponse(true));

    render(<BatchTriage estateId="estate-1" pendingItemIds={["item-1", "item-2", "item-3"]} />);

    fireEvent.click(screen.getByTestId("batch-triage-button"));

    await waitFor(() => {
      expect(screen.getByTestId("batch-triage-complete")).toBeInTheDocument();
    });
    // 3 POST + 3 SSE = 6 fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });
});
