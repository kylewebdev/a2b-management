/**
 * Server-side image resizing using sharp.
 * Used to ensure images sent to AI APIs are within their size limits.
 */
import sharp from "sharp";

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 80;
// Anthropic limit is 5MB base64. 3.5MB raw ≈ 4.67MB base64 — safe margin.
const MAX_RAW_BYTES = 3.5 * 1024 * 1024;

/**
 * Resize an image buffer if it exceeds size or dimension limits.
 * Returns { buffer, mimeType } — always JPEG after resize.
 */
export async function resizeForTriage(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const metadata = await sharp(buffer).metadata();
  const { width = 0, height = 0 } = metadata;

  const isWithinDimensions =
    width <= MAX_DIMENSION && height <= MAX_DIMENSION;
  const isSmallEnough = buffer.length <= MAX_RAW_BYTES;

  if (isWithinDimensions && isSmallEnough) {
    return { buffer, mimeType };
  }

  // Resize and compress
  let pipeline = sharp(buffer).resize(MAX_DIMENSION, MAX_DIMENSION, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // Always output as JPEG for consistency and compression
  pipeline = pipeline.jpeg({ quality: JPEG_QUALITY });

  const resized = await pipeline.toBuffer();
  return { buffer: resized, mimeType: "image/jpeg" };
}
