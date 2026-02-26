// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMetadata = vi.fn();
const mockResize = vi.fn();
const mockJpeg = vi.fn();
const mockToBuffer = vi.fn();

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    metadata: mockMetadata,
    resize: mockResize,
  })),
}));

// Chain: sharp(buf).resize().jpeg().toBuffer()
beforeEach(() => {
  vi.clearAllMocks();
  mockResize.mockReturnValue({ jpeg: mockJpeg });
  mockJpeg.mockReturnValue({ toBuffer: mockToBuffer });
});

import { resizeForTriage } from "../image-resize";

describe("resizeForTriage", () => {
  it("returns original buffer if within size and dimension limits", async () => {
    const buf = Buffer.alloc(1000); // well under 3.5MB
    mockMetadata.mockResolvedValue({ width: 1024, height: 768 });

    const result = await resizeForTriage(buf, "image/jpeg");

    expect(result.buffer).toBe(buf);
    expect(result.mimeType).toBe("image/jpeg");
    expect(mockResize).not.toHaveBeenCalled();
  });

  it("resizes when dimensions exceed 2048px", async () => {
    const buf = Buffer.alloc(1000);
    const resizedBuf = Buffer.alloc(500);
    mockMetadata.mockResolvedValue({ width: 4032, height: 3024 });
    mockToBuffer.mockResolvedValue(resizedBuf);

    const result = await resizeForTriage(buf, "image/png");

    expect(result.buffer).toBe(resizedBuf);
    expect(result.mimeType).toBe("image/jpeg");
    expect(mockResize).toHaveBeenCalledWith(2048, 2048, {
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 80 });
  });

  it("resizes when buffer exceeds 3.5MB even if dimensions are OK", async () => {
    const buf = Buffer.alloc(4 * 1024 * 1024); // 4MB > 3.5MB limit
    const resizedBuf = Buffer.alloc(500000);
    mockMetadata.mockResolvedValue({ width: 2000, height: 1500 });
    mockToBuffer.mockResolvedValue(resizedBuf);

    const result = await resizeForTriage(buf, "image/jpeg");

    expect(result.buffer).toBe(resizedBuf);
    expect(result.mimeType).toBe("image/jpeg");
    expect(mockResize).toHaveBeenCalled();
  });

  it("preserves original mimeType when no resize needed", async () => {
    const buf = Buffer.alloc(1000);
    mockMetadata.mockResolvedValue({ width: 800, height: 600 });

    const result = await resizeForTriage(buf, "image/webp");

    expect(result.mimeType).toBe("image/webp");
  });

  it("handles missing metadata dimensions gracefully", async () => {
    const buf = Buffer.alloc(1000);
    mockMetadata.mockResolvedValue({}); // width/height undefined

    const result = await resizeForTriage(buf, "image/jpeg");

    // width=0, height=0 → within limits, small buffer → no resize
    expect(result.buffer).toBe(buf);
  });
});
