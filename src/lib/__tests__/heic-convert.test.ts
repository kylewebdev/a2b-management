import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("heic2any", () => ({
  default: vi.fn(),
}));

import { isHeicFile, convertHeicToJpeg, prepareFilesForUpload } from "../heic-convert";
import heic2any from "heic2any";

function makeFile(name: string, type: string, size = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("HEIC conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isHeicFile", () => {
    it("detects HEIC by mime type image/heic", () => {
      expect(isHeicFile(makeFile("photo.jpg", "image/heic"))).toBe(true);
    });

    it("detects HEIF by mime type image/heif", () => {
      expect(isHeicFile(makeFile("photo.jpg", "image/heif"))).toBe(true);
    });

    it("detects HEIC by extension when mime is octet-stream", () => {
      expect(isHeicFile(makeFile("IMG_001.HEIC", "application/octet-stream"))).toBe(true);
    });

    it("detects HEIF by extension when mime is octet-stream", () => {
      expect(isHeicFile(makeFile("IMG_001.heif", "application/octet-stream"))).toBe(true);
    });

    it("returns false for JPEG", () => {
      expect(isHeicFile(makeFile("photo.jpg", "image/jpeg"))).toBe(false);
    });

    it("returns false for PNG", () => {
      expect(isHeicFile(makeFile("photo.png", "image/png"))).toBe(false);
    });

    it("returns false for WebP", () => {
      expect(isHeicFile(makeFile("photo.webp", "image/webp"))).toBe(false);
    });
  });

  describe("convertHeicToJpeg", () => {
    it("converts HEIC file to JPEG", async () => {
      const heicFile = makeFile("IMG_001.HEIC", "image/heic");
      const fakeBlob = new Blob(["converted"], { type: "image/jpeg" });
      vi.mocked(heic2any).mockResolvedValue(fakeBlob);

      const result = await convertHeicToJpeg(heicFile);

      expect(result.type).toBe("image/jpeg");
      expect(result.name).toBe("IMG_001.jpg");
      expect(heic2any).toHaveBeenCalledWith({
        blob: heicFile,
        toType: "image/jpeg",
        quality: 0.9,
      });
    });

    it("re-wraps as JPEG when heic2any reports already browser-readable", async () => {
      const heicFile = makeFile("IMG_001.HEIC", "application/octet-stream");
      vi.mocked(heic2any).mockRejectedValue({ code: 1, message: "ERR_USER Image is already browser readable: image/jpeg" });

      const result = await convertHeicToJpeg(heicFile);

      expect(result.name).toBe("IMG_001.jpg");
      expect(result.type).toBe("image/jpeg");
      expect(result.size).toBe(heicFile.size);
    });

    it("handles conversion failure gracefully", async () => {
      const heicFile = makeFile("broken.HEIC", "image/heic");
      vi.mocked(heic2any).mockRejectedValue(new Error("Conversion failed"));

      await expect(convertHeicToJpeg(heicFile)).rejects.toThrow("Conversion failed");
    });

    it("wraps non-Error throws in an Error", async () => {
      const heicFile = makeFile("broken.HEIC", "image/heic");
      vi.mocked(heic2any).mockRejectedValue({ code: 2, message: "ERR_PARSE something" });

      await expect(convertHeicToJpeg(heicFile)).rejects.toThrow("ERR_PARSE something");
    });
  });

  describe("prepareFilesForUpload", () => {
    it("passes JPEG files through unchanged", async () => {
      const file = makeFile("photo.jpg", "image/jpeg");
      const result = await prepareFilesForUpload([file]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("photo.jpg");
      expect(result[0].type).toBe("image/jpeg");
      expect(heic2any).not.toHaveBeenCalled();
    });

    it("converts HEIC files to JPEG", async () => {
      const heicFile = makeFile("IMG_001.HEIC", "image/heic");
      const fakeBlob = new Blob(["converted"], { type: "image/jpeg" });
      vi.mocked(heic2any).mockResolvedValue(fakeBlob);

      const result = await prepareFilesForUpload([heicFile]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("image/jpeg");
      expect(result[0].name).toBe("IMG_001.jpg");
    });

    it("handles mixed file types", async () => {
      const jpegFile = makeFile("photo.jpg", "image/jpeg");
      const heicFile = makeFile("IMG_002.HEIC", "image/heic");
      const pngFile = makeFile("screenshot.png", "image/png");
      const fakeBlob = new Blob(["converted"], { type: "image/jpeg" });
      vi.mocked(heic2any).mockResolvedValue(fakeBlob);

      const result = await prepareFilesForUpload([jpegFile, heicFile, pngFile]);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("photo.jpg");
      expect(result[1].name).toBe("IMG_002.jpg");
      expect(result[2].name).toBe("screenshot.png");
      expect(heic2any).toHaveBeenCalledTimes(1);
    });
  });
});
