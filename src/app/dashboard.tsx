"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { EstateCard, type EstateCardProps } from "@/components/estate-card";

export function Dashboard({ estates }: { estates: EstateCardProps[] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link
          href="/estates/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
        >
          <Plus size={16} />
          New Estate
        </Link>
      </div>

      {estates.length === 0 ? (
        <p className="mt-6 text-text-secondary">
          No active estates. Time to start digging.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {estates.map((estate) => (
            <EstateCard key={estate.id} {...estate} />
          ))}
        </div>
      )}
    </div>
  );
}
