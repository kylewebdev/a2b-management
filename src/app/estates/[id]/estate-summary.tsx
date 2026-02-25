"use client";

import type { EstateSummary } from "@/lib/estate-summary";

const tierColors: Record<string, string> = {
  "1": "text-tier-1 bg-tier-1/15",
  "2": "text-tier-2 bg-tier-2/15",
  "3": "text-tier-3 bg-tier-3/15",
  "4": "text-tier-4 bg-tier-4/15",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  triaged: "Triaged",
  routed: "Routed",
  resolved: "Resolved",
};

export function EstateSummaryPanel({ summary }: { summary: EstateSummary }) {
  if (summary.totalCount === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4" data-testid="estate-summary">
      {/* Tier breakdown */}
      <div className="flex flex-wrap gap-2">
        {(["1", "2", "3", "4"] as const).map((tier) => {
          const count = summary.tierBreakdown[tier];
          if (count === 0) return null;
          return (
            <span
              key={tier}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tierColors[tier]}`}
            >
              T{tier}: {count}
            </span>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {/* Total value */}
        {(summary.totalEstimatedValueLow > 0 || summary.totalEstimatedValueHigh > 0) && (
          <div>
            <span className="text-text-muted">Est. value: </span>
            <span className="font-medium text-text-primary">
              ${summary.totalEstimatedValueLow.toLocaleString()} – ${summary.totalEstimatedValueHigh.toLocaleString()}
            </span>
          </div>
        )}

        {/* Unresolved */}
        <div>
          <span className="font-medium text-text-primary">{summary.unresolvedCount}</span>
          <span className="text-text-muted"> of {summary.totalCount} unresolved</span>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = summary.statusBreakdown[status];
          if (count === 0) return null;
          return (
            <span key={status}>
              {label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
