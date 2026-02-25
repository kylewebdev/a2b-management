import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET env var is required for encryption");
  }
  // Derive a 32-byte key from the secret using SHA-256
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: IV (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64-encoded string that was encrypted with `encrypt()`.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey();
  const packed = Buffer.from(encryptedBase64, "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Mask an API key for display: "sk-...XXXX" (last 4 chars visible).
 */
export function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-...${last4}`;
}
