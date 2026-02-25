"use client";

import Link from "next/link";
import { Plus, Warehouse } from "lucide-react";
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
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
          <Warehouse size={24} className="text-text-muted" />
          <p className="mt-2 text-sm text-text-secondary">
            No active estates. Time to start digging.
          </p>
          <Link
            href="/estates/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          >
            <Plus size={16} />
            New Estate
          </Link>
        </div>
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
