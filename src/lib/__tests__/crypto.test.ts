// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Set test encryption secret before importing
const TEST_SECRET = "test-secret-key-that-is-32-chars!";

beforeEach(() => {
  vi.stubEnv("ENCRYPTION_SECRET", TEST_SECRET);
});

describe("encrypt/decrypt", () => {
  it("round-trips: decrypt(encrypt(text)) returns original", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const original = "sk-ant-api03-secret-key-12345";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it("encrypted value is not plaintext", async () => {
    const { encrypt } = await import("../crypto");
    const original = "sk-ant-api03-secret-key-12345";
    const encrypted = encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).not.toContain(original);
  });

  it("different inputs produce different ciphertext", async () => {
    const { encrypt } = await import("../crypto");
    const enc1 = encrypt("key-one");
    const enc2 = encrypt("key-two");

    expect(enc1).not.toBe(enc2);
  });

  it("same input produces different ciphertext (random IV)", async () => {
    const { encrypt } = await import("../crypto");
    const enc1 = encrypt("same-key");
    const enc2 = encrypt("same-key");

    expect(enc1).not.toBe(enc2);
  });

  it("throws when decrypting with wrong secret", async () => {
    const { encrypt } = await import("../crypto");
    const encrypted = encrypt("my-secret-key");

    // Change env to a different secret
    vi.stubEnv("ENCRYPTION_SECRET", "different-secret-32-characters!!");

    // Re-import to pick up new env var - need to reset module
    vi.resetModules();
    const { decrypt } = await import("../crypto");

    expect(() => decrypt(encrypted)).toThrow();
  });

  it("throws when ENCRYPTION_SECRET is not set", async () => {
    vi.stubEnv("ENCRYPTION_SECRET", "");
    vi.resetModules();
    const { encrypt } = await import("../crypto");

    expect(() => encrypt("test")).toThrow("ENCRYPTION_SECRET");
  });
});

describe("maskApiKey", () => {
  it("masks API key showing only last 4 characters", async () => {
    const { maskApiKey } = await import("../crypto");
    const masked = maskApiKey("sk-ant-api03-abcdefghijklmnop");

    expect(masked).toBe("sk-...mnop");
  });

  it("masks short keys", async () => {
    const { maskApiKey } = await import("../crypto");
    const masked = maskApiKey("short");

    expect(masked).toBe("sk-...hort");
  });
});
