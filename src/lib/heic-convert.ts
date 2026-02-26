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
  // Dynamic import — heic2any references `window` at module scope
  const { default: heic2any } = await import("heic2any");

  let blob: Blob | Blob[];
  try {
    blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
  } catch (err: unknown) {
    // heic2any throws a plain object {code:1, message:"ERR_USER ..."} when
    // the file is already browser-readable (e.g. JPEG inside a .heic container).
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 1) {
      // File is already JPEG — re-wrap with correct MIME type and extension
      const newName = file.name.replace(/\.[^.]+$/, ".jpg");
      return new File([file], newName, { type: "image/jpeg" });
    }
    throw err instanceof Error ? err : new Error(String((err as { message?: string }).message ?? err));
  }

  const result = Array.isArray(blob) ? blob[0] : blob;
  const newName = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([result], newName, { type: "image/jpeg" });
}

/** Prepare files for upload: convert HEIC to JPEG, pass others through. */
export async function prepareFilesForUpload(files: File[]): Promise<File[]> {
  // Sequential — heic2any is memory-heavy; parallel decodes crash mobile browsers
  const results: File[] = [];
  for (const file of files) {
    results.push(isHeicFile(file) ? await convertHeicToJpeg(file) : file);
  }
  return results;
}
