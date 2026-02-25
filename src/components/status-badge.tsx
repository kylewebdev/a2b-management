const variants = {
  active: "text-accent bg-accent-muted",
  resolving: "text-tier-2 bg-tier-2/15",
  closed: "text-text-muted bg-surface-raised",
} as const;

const labels = {
  active: "Active",
  resolving: "Resolving",
  closed: "Closed",
} as const;

type Status = keyof typeof variants;

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[status]}`}
    >
      {labels[status]}
    </span>
  );
}
