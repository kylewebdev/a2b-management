import Link from "next/link";
import { MapPin, Package, Clock } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { formatValueRange, formatRelativeTime } from "@/lib/format";
import type { RankedEstate } from "@/lib/dashboard-types";

export function DashboardEstateCard({
  id,
  name,
  address,
  status,
  itemCount,
  pendingCount,
  estimatedValueLow,
  estimatedValueHigh,
  lastActivity,
}: RankedEstate) {
  const valueText = formatValueRange(estimatedValueLow, estimatedValueHigh);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Package size={12} />
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="text-tier-2">
              {pendingCount} pending
            </span>
          )}
        </div>
        <span>{valueText}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
        <Clock size={12} />
        <span>{formatRelativeTime(lastActivity)}</span>
      </div>
    </Link>
  );
}
