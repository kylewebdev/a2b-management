import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsForm } from "../settings-form";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockSettingsResponse(overrides = {}) {
  return {
    aiProvider: "anthropic",
    aiModel: null,
    apiKeyAnthropic: null,
    apiKeyOpenai: null,
    apiKeyGoogle: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state then loads settings", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    render(<SettingsForm />);

    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/ai provider/i)).toBeInTheDocument();
    });
  });

  it("displays provider selector with correct default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    render(<SettingsForm />);

    await waitFor(() => {
      const select = screen.getByLabelText(/ai provider/i) as HTMLSelectElement;
      expect(select.value).toBe("anthropic");
    });
  });

  it("shows the API key field for the selected provider", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
    });

    // Should not show other provider key fields
    expect(screen.queryByLabelText(/openai api key/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/google api key/i)).not.toBeInTheDocument();
  });

  it("shows masked key when one is configured", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse({ apiKeyAnthropic: "sk-...ab12" })),
    });

    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByText("sk-...ab12")).toBeInTheDocument();
    });
  });

  it("switches provider and shows corresponding key field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    const user = userEvent.setup();
    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/ai provider/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/ai provider/i), "openai");

    expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/anthropic api key/i)).not.toBeInTheDocument();
  });

  it("saves settings on form submit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    const user = userEvent.setup();
    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/anthropic api key/i), "sk-ant-test-key-123");

    // Mock the save response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(mockSettingsResponse({ apiKeyAnthropic: "sk-...y123" })),
    });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
        method: "PUT",
      }));
    });
  });

  it("shows success message after saving", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    const user = userEvent.setup();
    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/anthropic api key/i), "sk-ant-test-key");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(mockSettingsResponse({ apiKeyAnthropic: "sk-...tkey" })),
    });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it("shows error message on save failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse()),
    });

    const user = userEvent.setup();
    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/anthropic api key/i), "sk-test");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });

  it("shows model override field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettingsResponse({ aiModel: "claude-opus-4-20250514" })),
    });

    render(<SettingsForm />);

    await waitFor(() => {
      const modelInput = screen.getByLabelText(/model override/i) as HTMLInputElement;
      expect(modelInput.value).toBe("claude-opus-4-20250514");
    });
  });

  it("shows fetch error when loading fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<SettingsForm />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
