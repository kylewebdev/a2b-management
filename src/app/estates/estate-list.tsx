"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { EstateCard, type EstateCardProps } from "@/components/estate-card";

export function EstateList({ estates }: { estates: EstateCardProps[] }) {
  if (estates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-text-secondary">No estates yet. Time to start digging.</p>
        <Link
          href="/estates/new"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
        >
          <Plus size={16} />
          New Estate
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Estates</h1>
        <Link
          href="/estates/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
        >
          <Plus size={16} />
          New Estate
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {estates.map((estate) => (
          <EstateCard key={estate.id} {...estate} />
        ))}
      </div>
    </div>
  );
}
