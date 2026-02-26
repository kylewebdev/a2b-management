import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Store the original env
const originalEnv = { ...process.env };

// Mock @googlemaps/js-api-loader functional API
let mockImportLibrary = vi.fn().mockResolvedValue({});
vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: (...args: any[]) => mockImportLibrary(...args),
}));

function setupGoogleMock(
  suggestions: Array<{
    mainText: string;
    secondaryText: string;
    formattedAddress: string;
  }> = [],
) {
  const mockSuggestions = suggestions.map((s) => ({
    placePrediction: {
      mainText: { text: s.mainText },
      secondaryText: { text: s.secondaryText },
      toPlace: () => {
        const place = {
          fetchFields: vi.fn().mockResolvedValue(undefined),
          formattedAddress: s.formattedAddress,
        };
        return place;
      },
    },
  }));

  const mockFetchAutocompleteSuggestions = vi
    .fn()
    .mockResolvedValue({ suggestions: mockSuggestions });

  (globalThis as any).google = {
    maps: {
      places: {
        AutocompleteSessionToken: class {},
        AutocompleteSuggestion: {
          fetchAutocompleteSuggestions: mockFetchAutocompleteSuggestions,
        },
      },
    },
  };

  return { mockFetchAutocompleteSuggestions };
}

describe("AddressAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockImportLibrary = vi.fn().mockResolvedValue({});
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    process.env = { ...originalEnv };
    delete (globalThis as any).google;
  });

  async function loadComponent(props: Record<string, any> = {}) {
    const mod = await import("../address-autocomplete");
    return render(<mod.AddressAutocomplete {...props} />);
  }

  it("renders plain input as fallback when no API key", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "";

    const mod = await import("../address-autocomplete");
    render(
      <mod.AddressAutocomplete
        name="address"
        id="address"
        placeholder="Enter address"
      />,
    );

    const input = screen.getByPlaceholderText("Enter address");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "address");
    expect(input.getAttribute("role")).toBeNull();
  });

  it("renders combobox with role when API key is present", async () => {
    setupGoogleMock();
    await loadComponent({ id: "address", placeholder: "Enter address" });

    await waitFor(() => {
      const input = screen.getByRole("combobox");
      expect(input).toBeInTheDocument();
    });
  });

  it("has data-1p-ignore on input", async () => {
    setupGoogleMock();
    await loadComponent({ id: "address" });

    await waitFor(() => {
      const input = screen.getByRole("combobox");
      expect(input).toHaveAttribute("data-1p-ignore");
    });
  });

  it("is disabled while SDK is loading", async () => {
    let resolveImport: (v: unknown) => void;
    mockImportLibrary = vi.fn(
      () => new Promise((r) => { resolveImport = r; }),
    );

    setupGoogleMock();
    // Need fresh module to pick up the new mockImportLibrary
    const mod = await import("../address-autocomplete");
    render(<mod.AddressAutocomplete id="address" placeholder="Enter address" />);

    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", "Loading...");

    await act(async () => {
      resolveImport!({});
    });

    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it("shows suggestions dropdown after typing", async () => {
    setupGoogleMock([
      {
        mainText: "123 Main St",
        secondaryText: "Springfield, IL",
        formattedAddress: "123 Main St, Springfield, IL 62701, USA",
      },
      {
        mainText: "456 Oak Ave",
        secondaryText: "Chicago, IL",
        formattedAddress: "456 Oak Ave, Chicago, IL 60601, USA",
      },
    ]);

    await loadComponent({ id: "address" });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "123 Main");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("123 Main St");
    expect(options[0]).toHaveTextContent("Springfield, IL");
  });

  it("calls onChange with formatted address on suggestion click (controlled)", async () => {
    setupGoogleMock([
      {
        mainText: "123 Main St",
        secondaryText: "Springfield, IL",
        formattedAddress: "123 Main St, Springfield, IL 62701, USA",
      },
    ]);

    const handleChange = vi.fn();
    await loadComponent({
      id: "address",
      value: "",
      onChange: handleChange,
    });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "123 Main");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    const option = screen.getByRole("option");
    await act(async () => {
      option.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        "123 Main St, Springfield, IL 62701, USA",
      );
    });
  });

  it("updates hidden input value on suggestion click (uncontrolled)", async () => {
    setupGoogleMock([
      {
        mainText: "123 Main St",
        secondaryText: "Springfield, IL",
        formattedAddress: "123 Main St, Springfield, IL 62701, USA",
      },
    ]);

    await loadComponent({ name: "address", id: "address" });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "123 Main");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    const option = screen.getByRole("option");
    await act(async () => {
      option.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });

    await waitFor(() => {
      const hidden = document.querySelector(
        'input[type="hidden"][name="address"]',
      ) as HTMLInputElement;
      expect(hidden.value).toBe(
        "123 Main St, Springfield, IL 62701, USA",
      );
    });
  });

  it("keyboard: ArrowDown/Enter selects, Escape closes", async () => {
    setupGoogleMock([
      {
        mainText: "123 Main St",
        secondaryText: "Springfield, IL",
        formattedAddress: "123 Main St, Springfield, IL 62701, USA",
      },
      {
        mainText: "456 Oak Ave",
        secondaryText: "Chicago, IL",
        formattedAddress: "456 Oak Ave, Chicago, IL 60601, USA",
      },
    ]);

    const handleChange = vi.fn();
    await loadComponent({
      id: "address",
      value: "",
      onChange: handleChange,
    });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "123 Main");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // ArrowDown to first option
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByRole("option")[0]).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    // Escape closes
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("outside click closes dropdown", async () => {
    setupGoogleMock([
      {
        mainText: "123 Main St",
        secondaryText: "Springfield, IL",
        formattedAddress: "123 Main St, Springfield, IL 62701, USA",
      },
    ]);

    await loadComponent({ id: "address" });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "123 Main");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // Click outside
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
