import Link from "next/link";
import { ImageOff } from "lucide-react";
import { TierBadge } from "./tier-badge";

export interface ItemCardProps {
  id: string;
  estateId: string;
  tier: "1" | "2" | "3" | "4" | null;
  status: "pending" | "triaged" | "routed" | "resolved";
  thumbnailUrl: string | null;
  aiIdentification: { title?: string } | null;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  triaged: "Triaged",
  routed: "Routed",
  resolved: "Resolved",
};

export function ItemCard({
  id,
  estateId,
  tier,
  status,
  thumbnailUrl,
  aiIdentification,
}: ItemCardProps) {
  const title =
    aiIdentification?.title ?? "Awaiting triage";

  return (
    <Link
      href={`/estates/${estateId}/items/${id}`}
      className="block rounded-lg border border-border bg-surface transition-colors hover:bg-surface-raised overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-surface-raised flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff size={24} className="text-text-muted" />
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-text-primary truncate">
            {title}
          </p>
          <TierBadge tier={tier} />
        </div>
        <p className="mt-1 text-xs text-text-muted">{statusLabels[status]}</p>
      </div>
    </Link>
  );
}
