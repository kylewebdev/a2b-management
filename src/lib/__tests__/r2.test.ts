// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AWS SDK modules
const mockSend = vi.fn();

const mockPutObjectCommand = vi.fn();
const mockGetObjectCommand = vi.fn();
const mockDeleteObjectCommand = vi.fn();
const mockDeleteObjectsCommand = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = mockSend;
    },
    PutObjectCommand: class {
      constructor(input: unknown) { mockPutObjectCommand(input); Object.assign(this, input); }
    },
    GetObjectCommand: class {
      constructor(input: unknown) { mockGetObjectCommand(input); Object.assign(this, input); }
    },
    DeleteObjectCommand: class {
      constructor(input: unknown) { mockDeleteObjectCommand(input); Object.assign(this, input); }
    },
    DeleteObjectsCommand: class {
      constructor(input: unknown) { mockDeleteObjectsCommand(input); Object.assign(this, input); }
    },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com/photo.jpg"),
}));

import {
  uploadFile,
  deleteFile,
  deleteFiles,
  getSignedViewUrl,
  generateR2Key,
  MAX_FILE_SIZE,
} from "../r2";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

describe("R2 Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    // Set test env vars so getClient() doesn't throw
    process.env.R2_ACCOUNT_ID = "test-account";
    process.env.R2_ACCESS_KEY_ID = "test-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.R2_BUCKET_NAME = "test-bucket";
  });

  describe("generateR2Key", () => {
    it("generates key in correct format", () => {
      const key = generateR2Key("estate-1", "item-1", "photo.jpg");
      expect(key).toMatch(
        /^estates\/estate-1\/items\/item-1\/[0-9a-f-]+\.jpg$/
      );
    });

    it("preserves file extension", () => {
      const key = generateR2Key("e1", "i1", "image.png");
      expect(key).toMatch(/\.png$/);
    });

    it("handles HEIC extension", () => {
      const key = generateR2Key("e1", "i1", "IMG_001.HEIC");
      expect(key).toMatch(/\.heic$/);
    });

    it("generates unique keys for same inputs", () => {
      const key1 = generateR2Key("e1", "i1", "photo.jpg");
      const key2 = generateR2Key("e1", "i1", "photo.jpg");
      expect(key1).not.toBe(key2);
    });
  });

  describe("MAX_FILE_SIZE", () => {
    it("is 15MB", () => {
      expect(MAX_FILE_SIZE).toBe(15 * 1024 * 1024);
    });
  });

  describe("uploadFile", () => {
    it("calls PutObjectCommand with correct params", async () => {
      const buffer = Buffer.from("fake-image");
      const r2Key = "estates/e1/items/i1/abc.jpg";

      await uploadFile(r2Key, buffer, "image/jpeg");

      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: expect.any(String),
        Key: r2Key,
        Body: buffer,
        ContentType: "image/jpeg",
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("rejects files over 15MB", async () => {
      const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);

      await expect(uploadFile("key", buffer, "image/jpeg")).rejects.toThrow(
        "File exceeds maximum size"
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("propagates S3 errors", async () => {
      mockSend.mockRejectedValue(new Error("S3 failure"));
      const buffer = Buffer.from("data");

      await expect(uploadFile("key", buffer, "image/jpeg")).rejects.toThrow(
        "S3 failure"
      );
    });
  });

  describe("deleteFile", () => {
    it("calls DeleteObjectCommand with correct key", async () => {
      await deleteFile("estates/e1/items/i1/abc.jpg");

      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: expect.any(String),
        Key: "estates/e1/items/i1/abc.jpg",
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteFiles", () => {
    it("calls DeleteObjectsCommand with multiple keys", async () => {
      const keys = ["key1.jpg", "key2.jpg", "key3.jpg"];
      await deleteFiles(keys);

      expect(mockDeleteObjectsCommand).toHaveBeenCalledWith({
        Bucket: expect.any(String),
        Delete: {
          Objects: [{ Key: "key1.jpg" }, { Key: "key2.jpg" }, { Key: "key3.jpg" }],
        },
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("does nothing for empty array", async () => {
      await deleteFiles([]);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("getSignedViewUrl", () => {
    it("returns a signed URL with 3600s expiry", async () => {
      const url = await getSignedViewUrl("estates/e1/items/i1/abc.jpg");

      expect(url).toBe("https://signed-url.example.com/photo.jpg");
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 }
      );
    });
  });
});
