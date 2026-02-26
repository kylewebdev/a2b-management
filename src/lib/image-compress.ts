/**
 * Client-side image compression using Canvas API.
 * Resizes images to a max dimension and re-encodes as JPEG.
 * No external dependencies — works in all modern mobile browsers.
 */

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const TARGET_MAX_BYTES = 4 * 1024 * 1024; // 4MB — safe for AI APIs after base64

/**
 * Compress an image file to a max dimension and JPEG quality.
 * Returns the original file if it's already small enough and is JPEG/WebP.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-image files (shouldn't happen, but be safe)
  if (!file.type.startsWith("image/")) return file;

  // Load the image into an HTMLImageElement
  const img = await loadImage(file);

  // If image is already within bounds and small, skip compression
  const isSmallEnough = file.size <= TARGET_MAX_BYTES;
  const isWithinDimensions =
    img.naturalWidth <= MAX_DIMENSION && img.naturalHeight <= MAX_DIMENSION;
  const isCompressedFormat =
    file.type === "image/jpeg" || file.type === "image/webp";

  if (isSmallEnough && isWithinDimensions && isCompressedFormat) {
    return file;
  }

  // Calculate new dimensions maintaining aspect ratio
  const { width, height } = fitDimensions(
    img.naturalWidth,
    img.naturalHeight,
    MAX_DIMENSION
  );

  // Draw to canvas and export
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  ctx.drawImage(img, 0, 0, width, height);

  // Export as JPEG
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  const newName = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}

function fitDimensions(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) {
    return { width, height };
  }

  const ratio = Math.min(maxDim / width, maxDim / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
