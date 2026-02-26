"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Undo2 } from "lucide-react";
import { getRoutingGuidance } from "@/lib/disposition";
import { useToast } from "@/components/toast";

const tierColors: Record<string, string> = {
  "1": "border-tier-1 bg-tier-1/10 text-tier-1",
  "2": "border-tier-2 bg-tier-2/10 text-tier-2",
  "3": "border-tier-3 bg-tier-3/10 text-tier-3",
  "4": "border-tier-4 bg-tier-4/10 text-tier-4",
};

interface RoutingGuidanceProps {
  itemId: string;
  status: string;
  tier: string;
  valuation: { lowEstimate?: number; highEstimate?: number } | null;
}

export function RoutingGuidance({ itemId, status, tier, valuation }: RoutingGuidanceProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [acknowledging, setAcknowledging] = useState(false);

  if (status === "pending") return null;

  const guidance = getRoutingGuidance(tier, valuation);
  const colorClass = tierColors[tier] ?? "border-border bg-surface text-text-secondary";
  const isAcknowledged = status === "routed" || status === "resolved";
  const canUnacknowledge = status === "routed";

  async function handleAcknowledge() {
    setAcknowledging(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "routed" }),
      });
      if (res.ok) {
        addToast({
          type: "success",
          message: "Routing acknowledged",
          action: {
            label: "Undo",
            onClick: async () => {
              const undoRes = await fetch(`/api/items/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "triaged" }),
              });
              if (undoRes.ok) router.refresh();
            },
          },
        });
        router.refresh();
      }
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <div className={`mt-4 rounded-lg border p-3 ${colorClass}`} data-testid="routing-guidance">
      <p className="text-sm font-medium">{guidance}</p>

      {status === "triaged" && (
        <button
          onClick={handleAcknowledge}
          disabled={acknowledging}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-raised disabled:opacity-50"
        >
          {acknowledging ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Acknowledging...
            </>
          ) : (
            <>
              <CheckCircle size={12} />
              Acknowledge
            </>
          )}
        </button>
      )}

      {isAcknowledged && (
        <div className="mt-2 flex items-center gap-3">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <CheckCircle size={12} />
            Routing acknowledged
          </p>
          {canUnacknowledge && (
            <button
              onClick={async () => {
                const res = await fetch(`/api/items/${itemId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "triaged" }),
                });
                if (res.ok) router.refresh();
              }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
            >
              <Undo2 size={10} />
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
