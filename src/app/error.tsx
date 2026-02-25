"use client";

import { AlertTriangle } from "lucide-react";

export default function RootError({
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
        <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
