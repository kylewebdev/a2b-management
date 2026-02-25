const variants = {
  "1": "text-tier-1 bg-tier-1/15",
  "2": "text-tier-2 bg-tier-2/15",
  "3": "text-tier-3 bg-tier-3/15",
  "4": "text-tier-4 bg-tier-4/15",
} as const;

const labels = {
  "1": "Tier 1",
  "2": "Tier 2",
  "3": "Tier 3",
  "4": "Tier 4",
} as const;

type Tier = "1" | "2" | "3" | "4" | null;

export function TierBadge({ tier }: { tier: Tier }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-text-muted bg-surface-raised">
        Pending
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[tier]}`}
    >
      {labels[tier]}
    </span>
  );
}
