import Link from "next/link";
import { ImageOff, ChevronRight } from "lucide-react";
import { TierBadge } from "./tier-badge";
import { DISPOSITION_LABELS, type Disposition } from "@/lib/disposition";

export interface ItemCardProps {
  id: string;
  estateId: string;
  tier: "1" | "2" | "3" | "4" | null;
  status: "pending" | "triaged" | "routed" | "resolved";
  thumbnailUrl: string | null;
  aiIdentification: { title?: string } | null;
  aiValuation: { lowEstimate?: number; highEstimate?: number } | null;
  disposition?: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  triaged: "Triaged",
  routed: "Routed",
  resolved: "Resolved",
};

const tierBorderColors: Record<string, string> = {
  "1": "border-l-2 border-l-tier-1",
  "2": "border-l-2 border-l-tier-2",
  "3": "border-l-2 border-l-tier-3",
  "4": "border-l-2 border-l-tier-4",
};

function formatValue(val: number): string {
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${val}`;
}

export function ItemCard({
  id,
  estateId,
  tier,
  status,
  thumbnailUrl,
  aiIdentification,
  aiValuation,
  disposition,
}: ItemCardProps) {
  const title = aiIdentification?.title ?? "Awaiting triage";

  const low = aiValuation?.lowEstimate;
  const high = aiValuation?.highEstimate;
  const valueText =
    low != null && high != null
      ? `${formatValue(low)} – ${formatValue(high)}`
      : null;

  const tierBorder = tier ? tierBorderColors[tier] ?? "" : "";

  // Show disposition label instead of status when resolved with a disposition
  const subtitleText =
    status === "resolved" && disposition && disposition in DISPOSITION_LABELS
      ? DISPOSITION_LABELS[disposition as Disposition]
      : statusLabels[status];

  return (
    <Link
      href={`/estates/${estateId}/items/${id}`}
      className={`flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-raised ${tierBorder}`}
    >
      {/* Thumbnail */}
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-surface-raised flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff size={18} className="text-text-muted" />
        )}
      </div>

      {/* Title + status */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{subtitleText}</p>
      </div>

      {/* Tier */}
      <TierBadge tier={tier} />

      {/* Value */}
      <span className="hidden sm:block flex-shrink-0 text-sm text-text-secondary">
        {valueText ?? "—"}
      </span>

      {/* Chevron */}
      <ChevronRight size={16} className="flex-shrink-0 text-text-muted" />
    </Link>
  );
}
