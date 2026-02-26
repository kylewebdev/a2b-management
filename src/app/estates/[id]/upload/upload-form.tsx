"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, Loader2, CheckCircle2, Upload } from "lucide-react";
import { prepareFilesForUpload } from "@/lib/heic-convert";
import { compressImages } from "@/lib/image-compress";
import { MAX_PHOTOS } from "@/lib/validations/item";
import { useToast } from "@/components/toast";

type UploadState = "idle" | "preparing" | "uploading" | "success" | "error";

interface UploadFormProps {
  estateId: string;
  estateName: string;
}

export function UploadForm({ estateId, estateName }: UploadFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const combined = [...files, ...selected].slice(0, MAX_PHOTOS);
    setFiles(combined);

    // Generate previews
    const newPreviews = combined.map((f) => URL.createObjectURL(f));
    // Revoke old previews
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews(newPreviews);
    setErrorMessage(null);

    // Reset file inputs so same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) return;

    setUploadState("preparing");
    setErrorMessage(null);

    try {
      // Convert HEIC → JPEG, then compress all images for upload
      const converted = await prepareFilesForUpload(files);
      const prepared = await compressImages(converted);

      setUploadState("uploading");

      const formData = new FormData();
      prepared.forEach((f) => formData.append("photos", f));

      const res = await fetch(`/api/estates/${estateId}/items`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let message: string;
        try {
          message = JSON.parse(text).error;
        } catch {
          message = `Server error ${res.status}`;
        }
        throw new Error(message);
      }

      setUploadState("success");
    } catch (err) {
      setUploadState("error");
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMessage(msg);
      addToast({ type: "error", message: msg });
    }
  }

  function handleReset() {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setUploadState("idle");
    setErrorMessage(null);
  }

  function handleViewEstate() {
    router.push(`/estates/${estateId}`);
  }

  const canUpload = files.length > 0 && files.length <= MAX_PHOTOS && uploadState === "idle";
  const isProcessing = uploadState === "preparing" || uploadState === "uploading";

  return (
    <div>
      <h1 className="text-xl font-bold">Upload Photos</h1>
      <p className="mt-1 text-sm text-text-secondary">{estateName}</p>

      {uploadState === "success" ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-accent/30 bg-accent-muted p-6 text-center">
          <CheckCircle2 size={32} className="text-accent" />
          <p className="mt-2 font-medium text-text-primary">Item uploaded!</p>
          <p className="mt-1 text-sm text-text-secondary">
            Photos have been saved and the item is ready for triage.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleReset}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
            >
              Upload Another
            </button>
            <button
              onClick={handleViewEstate}
              className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
            >
              Back to Estate
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* File picker */}
          <div className="mt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="photo-input"
              disabled={isProcessing}
            />
            <label
              htmlFor="photo-input"
              className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-accent/50 hover:bg-surface"
            >
              <Camera size={32} className="text-text-muted" />
              <p className="mt-2 text-sm font-medium text-text-primary">
                Tap to select photos
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Up to {MAX_PHOTOS} photos per item. HEIC files will be converted automatically.
              </p>
            </label>

            {/* Direct camera shortcut for mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="camera-input"
              disabled={isProcessing}
            />
            <label
              htmlFor="camera-input"
              className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
            >
              <Camera size={16} />
              Take Photo
            </label>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2" data-testid="preview-grid">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-surface-raised">
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {!isProcessing && (
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 rounded-full bg-bg/80 p-1 text-text-secondary hover:text-text-primary"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Photo count */}
          {files.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              {files.length} of {MAX_PHOTOS} photos selected
            </p>
          )}

          {/* Error message */}
          {errorMessage && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          )}

          {/* Upload button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!canUpload || isProcessing}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {uploadState === "preparing" ? "Preparing..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Item
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
