import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { StatusBadge } from "./status-badge";

export interface EstateCardProps {
  id: string;
  name: string | null;
  address: string;
  status: "active" | "resolving" | "closed";
  itemCount: number;
  createdAt: string;
}

export function EstateCard({ id, name, address, status, itemCount, createdAt }: EstateCardProps) {
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/estates/${id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary">{name ?? address}</h3>
        <StatusBadge status={status} />
      </div>
      {name && (
      <div className="mt-2 flex items-center gap-1.5 text-sm text-text-secondary">
        <MapPin size={14} />
        <span>{address}</span>
      </div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Package size={12} />
          <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
        </div>
        <span>{date}</span>
      </div>
    </Link>
  );
}
