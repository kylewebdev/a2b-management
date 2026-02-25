"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function EstateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle size={32} className="mx-auto text-red-400" />
        <h1 className="mt-4 text-xl font-bold">Failed to load estate</h1>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          >
            Try Again
          </button>
          <Link
            href="/estates"
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
          >
            Back to Estates
          </Link>
        </div>
      </div>
    </div>
  );
}
