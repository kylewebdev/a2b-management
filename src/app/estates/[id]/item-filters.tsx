"use client";

interface ItemFiltersProps {
  tierFilter: string | null;
  statusFilter: string | null;
  onTierChange: (tier: string | null) => void;
  onStatusChange: (status: string | null) => void;
}

const TIERS = ["1", "2", "3", "4"] as const;
const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "triaged", label: "Triaged" },
  { value: "routed", label: "Routed" },
  { value: "resolved", label: "Resolved" },
] as const;

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent/15 text-accent"
          : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

export function ItemFilters({ tierFilter, statusFilter, onTierChange, onStatusChange }: ItemFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="item-filters">
      {/* Tier filters */}
      <div className="flex items-center gap-1">
        <FilterButton active={tierFilter === null} onClick={() => onTierChange(null)}>
          All
        </FilterButton>
        {TIERS.map((tier) => (
          <FilterButton
            key={tier}
            active={tierFilter === tier}
            onClick={() => onTierChange(tier)}
          >
            T{tier}
          </FilterButton>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1">
        <FilterButton active={statusFilter === null} onClick={() => onStatusChange(null)}>
          All
        </FilterButton>
        {STATUSES.map(({ value, label }) => (
          <FilterButton
            key={value}
            active={statusFilter === value}
            onClick={() => onStatusChange(value)}
          >
            {label}
          </FilterButton>
        ))}
      </div>
    </div>
  );
}
