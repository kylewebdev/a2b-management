import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock canvas and image loading for jsdom
const mockDrawImage = vi.fn();
const mockToBlob = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock HTMLCanvasElement.getContext
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: mockDrawImage }),
        toBlob: mockToBlob,
      };
      return canvas as unknown as HTMLCanvasElement;
    }
    return document.createElement(tag);
  });

  // Mock URL.createObjectURL / revokeObjectURL
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

// We need to mock the Image constructor
const mockImageInstances: Array<{ onload?: () => void; onerror?: () => void; src?: string; naturalWidth: number; naturalHeight: number }> = [];

vi.stubGlobal("Image", class MockImage {
  onload?: () => void;
  onerror?: () => void;
  src?: string;
  naturalWidth = 4032;
  naturalHeight = 3024;
  constructor() {
    mockImageInstances.push(this);
    // Trigger onload async
    setTimeout(() => this.onload?.(), 0);
  }
});

import { compressImage, compressImages } from "../image-compress";

describe("compressImage", () => {
  it("compresses a large JPEG file", async () => {
    const compressedBlob = new Blob(["compressed"], { type: "image/jpeg" });
    mockToBlob.mockImplementation(
      (cb: BlobCallback, _type: string, _quality: number) => cb(compressedBlob)
    );

    const file = new File([new ArrayBuffer(5 * 1024 * 1024)], "big-photo.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImage(file);

    expect(result.name).toBe("big-photo.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(mockDrawImage).toHaveBeenCalled();
  });

  it("converts PNG to JPEG during compression", async () => {
    const compressedBlob = new Blob(["compressed"], { type: "image/jpeg" });
    mockToBlob.mockImplementation(
      (cb: BlobCallback, _type: string, _quality: number) => cb(compressedBlob)
    );

    const file = new File(["png-data"], "screenshot.png", {
      type: "image/png",
    });

    const result = await compressImage(file);

    expect(result.name).toBe("screenshot.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("skips non-image files", async () => {
    const file = new File(["data"], "readme.txt", { type: "text/plain" });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });
});

describe("compressImages", () => {
  it("compresses multiple files in parallel", async () => {
    const compressedBlob = new Blob(["compressed"], { type: "image/jpeg" });
    mockToBlob.mockImplementation(
      (cb: BlobCallback, _type: string, _quality: number) => cb(compressedBlob)
    );

    const files = [
      new File([new ArrayBuffer(5 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" }),
      new File([new ArrayBuffer(5 * 1024 * 1024)], "b.jpg", { type: "image/jpeg" }),
    ];

    const results = await compressImages(files);
    expect(results).toHaveLength(2);
  });
});
