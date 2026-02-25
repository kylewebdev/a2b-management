"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";

export default function ItemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ id: string }>();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle size={32} className="mx-auto text-red-400" />
        <h1 className="mt-4 text-xl font-bold">Failed to load item</h1>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          >
            Try Again
          </button>
          <Link
            href={`/estates/${params.id}`}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
          >
            Back to Estate
          </Link>
        </div>
      </div>
    </div>
  );
}
