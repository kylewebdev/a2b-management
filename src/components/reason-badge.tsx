const variants = {
  awaiting_disposition: "text-tier-2 bg-tier-2/15",
  stale: "text-tier-4 bg-tier-4/15",
  low_confidence: "text-tier-3 bg-tier-3/15",
} as const;

const labels = {
  awaiting_disposition: "Needs Disposition",
  stale: "Stale",
  low_confidence: "Low Confidence",
} as const;

type Reason = keyof typeof variants;

export function ReasonBadge({ reason }: { reason: Reason }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[reason]}`}
    >
      {labels[reason]}
    </span>
  );
}
