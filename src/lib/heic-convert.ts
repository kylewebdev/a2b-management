import heic2any from "heic2any";

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = new Set(["heic", "heif"]);

/** Check if a file is HEIC/HEIF by MIME type or extension. */
export function isHeicFile(file: File): boolean {
  if (HEIC_MIME_TYPES.has(file.type)) return true;

  // Some browsers report HEIC as application/octet-stream — check extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? HEIC_EXTENSIONS.has(ext) : false;
}

/** Convert a HEIC/HEIF file to JPEG. */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const blob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });

  const result = Array.isArray(blob) ? blob[0] : blob;
  const newName = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([result], newName, { type: "image/jpeg" });
}

/** Prepare files for upload: convert HEIC to JPEG, pass others through. */
export async function prepareFilesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(
    files.map((file) => (isHeicFile(file) ? convertHeicToJpeg(file) : file))
  );
}
