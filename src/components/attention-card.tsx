import Link from "next/link";
import { Package } from "lucide-react";
import { ReasonBadge } from "./reason-badge";
import type { AttentionEstate } from "@/lib/dashboard-types";

export function AttentionCard({
  id,
  name,
  address,
  reason,
  reasonDetail,
  itemCount,
}: AttentionEstate) {
  return (
    <Link
      href={`/estates/${id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary">{name ?? address}</h3>
        <ReasonBadge reason={reason} />
      </div>
      <p className="mt-1 text-sm text-text-secondary">{reasonDetail}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-text-muted">
        <Package size={12} />
        <span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>
    </Link>
  );
}
