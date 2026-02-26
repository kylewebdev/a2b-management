import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadForm } from "../upload-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock heic-convert — pass files through unchanged
vi.mock("@/lib/heic-convert", () => ({
  prepareFilesForUpload: vi.fn((files: File[]) => Promise.resolve(files)),
}));

// Mock image-compress — pass files through unchanged (no Canvas in jsdom)
vi.mock("@/lib/image-compress", () => ({
  compressImages: vi.fn((files: File[]) => Promise.resolve(files)),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

function createTestFile(name = "photo.jpg", type = "image/jpeg"): File {
  return new File(["fake-image-data"], name, { type });
}

describe("UploadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload form with file input", () => {
    render(<UploadForm estateId="e1" estateName="123 Main St" />);
    expect(screen.getByText("Upload Photos")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText(/Tap to select photos/)).toBeInTheDocument();
  });

  it("accepts image files including HEIC", () => {
    render(<UploadForm estateId="e1" estateName="Test" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain("image/*");
    expect(input.accept).toContain(".heic");
  });

  it("shows preview thumbnails after selection", async () => {
    const user = userEvent.setup();
    render(<UploadForm estateId="e1" estateName="Test" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createTestFile();
    await user.upload(input, file);

    expect(screen.getByTestId("preview-grid")).toBeInTheDocument();
    expect(screen.getByText("1 of 5 photos selected")).toBeInTheDocument();
  });

  it("upload button disabled with 0 photos", () => {
    render(<UploadForm estateId="e1" estateName="Test" />);
    const button = screen.getByRole("button", { name: /Upload Item/i });
    expect(button).toBeDisabled();
  });

  it("upload button enabled with photos selected", async () => {
    const user = userEvent.setup();
    render(<UploadForm estateId="e1" estateName="Test" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, createTestFile());

    const button = screen.getByRole("button", { name: /Upload Item/i });
    expect(button).not.toBeDisabled();
  });

  it("shows success state after upload", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "item-1", photos: [] }),
    });

    render(<UploadForm estateId="e1" estateName="Test" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, createTestFile());

    const button = screen.getByRole("button", { name: /Upload Item/i });
    await user.click(button);

    expect(await screen.findByText("Item uploaded!")).toBeInTheDocument();
    expect(screen.getByText("Upload Another")).toBeInTheDocument();
  });

  it("'Upload Another' resets form", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "item-1", photos: [] }),
    });

    render(<UploadForm estateId="e1" estateName="Test" />);

    // Upload a file
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, createTestFile());
    await user.click(screen.getByRole("button", { name: /Upload Item/i }));

    // Wait for success, then click Upload Another
    await screen.findByText("Item uploaded!");
    await user.click(screen.getByText("Upload Another"));

    // Should be back to idle state
    expect(screen.getByText(/Tap to select photos/)).toBeInTheDocument();
    expect(screen.queryByText("Item uploaded!")).not.toBeInTheDocument();
  });

  it("shows remove button per photo", async () => {
    const user = userEvent.setup();
    render(<UploadForm estateId="e1" estateName="Test" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, [createTestFile("a.jpg"), createTestFile("b.jpg")]);

    const removeButtons = screen.getAllByLabelText(/Remove photo/);
    expect(removeButtons).toHaveLength(2);
  });

  it("removes a photo when remove button clicked", async () => {
    const user = userEvent.setup();
    render(<UploadForm estateId="e1" estateName="Test" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, [createTestFile("a.jpg"), createTestFile("b.jpg")]);

    expect(screen.getByText("2 of 5 photos selected")).toBeInTheDocument();

    await user.click(screen.getAllByLabelText(/Remove photo/)[0]);

    expect(screen.getByText("1 of 5 photos selected")).toBeInTheDocument();
  });

  it("shows error state on upload failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<UploadForm estateId="e1" estateName="Test" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, createTestFile());
    await user.click(screen.getByRole("button", { name: /Upload Item/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  });
});
